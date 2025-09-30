import { HVACModelParser } from '../services/hvacParser';

describe('HVAC Critical Regression Tests', () => {
  const parser = new HVACModelParser();

  describe('Critical Voltage Detection Fixes', () => {
    it('should correctly detect Trane 3-phase commercial voltages (A3000 → 460V 3-phase)', () => {
      const result = parser.parseModelNumberSync('TWR036A3000AA');
      expect(result).toBeTruthy();
      expect(result?.manufacturer).toBe('Trane');
      expect(result?.voltage).toBe('460');
      expect(result?.phases).toBe('3');
      expect(result?.btuCapacity).toBe(36000);
    });

    it('should correctly detect Trane 1-phase residential voltages (A1000 → 208/230 1-phase)', () => {
      const result = parser.parseModelNumberSync('TWR036A1000AA');
      expect(result).toBeTruthy();
      expect(result?.manufacturer).toBe('Trane');
      expect(result?.voltage).toBe('208/230');
      expect(result?.phases).toBe('1');
    });
  });

  describe('Pattern Collision Prevention', () => {
    it('should correctly identify YCJF36S41S2 as York (not Goodman misclassification)', () => {
      const result = parser.parseModelNumberSync('YCJF36S41S2');
      expect(result).toBeTruthy();
      expect(result?.manufacturer).toBe('York');
      expect(result?.confidence).toBeGreaterThanOrEqual(90);
      expect(result?.btuCapacity).toBe(36000);
    });

    it('should still correctly identify Goodman models as Goodman', () => {
      const result = parser.parseModelNumberSync('GSZ160361A1');
      expect(result).toBeTruthy();
      expect(result?.manufacturer).toBe('Goodman');
      expect(result?.confidence).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Asian Manufacturer Capacity Bug Fix', () => {
    it('should correctly map LG 120 token to 12,000 BTU (not 120,000)', () => {
      const result = parser.parseModelNumberSync('LSN120HV4');
      expect(result).toBeTruthy();
      expect(result?.manufacturer).toBe('LG');
      expect(result?.btuCapacity).toBe(12000); // CRITICAL: 12,000 not 120,000
    });
  });

  describe('Lennox Dash-Separated Parsing', () => {
    it('should correctly parse Lennox models with dash separators', () => {
      const result = parser.parseModelNumberSync('XP16-036-230');
      expect(result).toBeTruthy();
      expect(result?.manufacturer).toBe('Lennox');
      expect(result?.btuCapacity).toBe(36000);
      expect(result?.confidence).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Voltage Format Consistency', () => {
    it('should return consistent voltage format (208/230 not 208-230)', () => {
      const testModels = ['TWR036A1000AA', 'YCJF36S41S2', 'XP16-036-230', 'GSZ160361A1'];
      
      testModels.forEach(model => {
        const result = parser.parseModelNumberSync(model);
        if (result?.voltage) {
          // Should use slash format, not dash format
          expect(result.voltage).toMatch(/^[0-9\/]+$/);
          expect(result.voltage).not.toContain('-');
        }
      });
    });
  });
});