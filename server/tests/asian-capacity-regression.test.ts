import { HVACModelParser } from '../services/hvacParser';

describe('Asian Manufacturer Capacity Decoding - Regression Tests', () => {
  let parser: HVACModelParser;

  beforeEach(() => {
    parser = new HVACModelParser();
  });

  describe('LG Large Capacity Edge Cases', () => {
    test('should decode LG 090 capacity code (90K BTU) without normalization interference', () => {
      const result = parser.parseModelNumber('LSU090HSV4');
      
      expect(result).not.toBeNull();
      expect(result!.manufacturer).toBe('LG');
      expect(result!.btuCapacity).toBe(90000);
      expect(result!.systemType).toBe('Heat Pump');
      expect(result!.confidence).toBe(88);
    });

    test('should decode LG 120 capacity code (120K BTU) - exact mapping priority', () => {
      const result = parser.parseModelNumber('LSN120HV4');
      
      expect(result).not.toBeNull();
      expect(result!.manufacturer).toBe('LG');
      expect(result!.btuCapacity).toBe(120000);
      expect(result!.systemType).toBe('Heat Pump');
      expect(result!.confidence).toBe(88);
    });

    test('should decode LG 180 capacity code (180K BTU) - large commercial unit', () => {
      const result = parser.parseModelNumber('LSU180HSV4');
      
      expect(result).not.toBeNull();
      expect(result!.manufacturer).toBe('LG');
      expect(result!.btuCapacity).toBe(180000);
      expect(result!.systemType).toBe('Heat Pump');
      expect(result!.confidence).toBe(88);
    });

    test('should decode LG 240 capacity code (240K BTU) - large commercial unit', () => {
      const result = parser.parseModelNumber('LSA240HSV4');
      
      expect(result).not.toBeNull();
      expect(result!.manufacturer).toBe('LG');
      expect(result!.btuCapacity).toBe(240000);
      expect(result!.systemType).toBe('Straight A/C');
      expect(result!.confidence).toBe(88);
    });

    test('should reject LG invalid capacity codes that are not in mapping', () => {
      const result = parser.parseModelNumber('LSU999HSV4');
      
      expect(result).toBeNull();
    });
  });

  describe('Mitsubishi Large Capacity Edge Cases', () => {
    test('should decode Mitsubishi 090 capacity code using exact mapping', () => {
      const result = parser.parseModelNumber('MSZ-FE090NA');
      
      expect(result).not.toBeNull();
      expect(result!.manufacturer).toBe('Mitsubishi');
      expect(result!.btuCapacity).toBe(90000);
      expect(result!.systemType).toBe('Heat Pump');
      expect(result!.confidence).toBe(92);
    });

    test('should decode Mitsubishi 120 capacity code - exact mapping priority', () => {
      const result = parser.parseModelNumber('PLA-A120AA4');
      
      expect(result).not.toBeNull();
      expect(result!.manufacturer).toBe('Mitsubishi');
      expect(result!.btuCapacity).toBe(120000);
      expect(result!.systemType).toBe('Heat Pump');
      expect(result!.confidence).toBe(92);
    });

    test('should decode Mitsubishi 180 capacity code - commercial applications', () => {
      const result = parser.parseModelNumber('MLZ-KP180VF');
      
      expect(result).not.toBeNull();
      expect(result!.manufacturer).toBe('Mitsubishi');
      expect(result!.btuCapacity).toBe(180000);
      expect(result!.systemType).toBe('Straight A/C');
      expect(result!.confidence).toBe(92);
    });

    test('should decode Mitsubishi 240 capacity code - large commercial unit', () => {
      const result = parser.parseModelNumber('MUZ-GL240NA');
      
      expect(result).not.toBeNull();
      expect(result!.manufacturer).toBe('Mitsubishi');
      expect(result!.btuCapacity).toBe(240000);
      expect(result!.systemType).toBe('Straight A/C');
      expect(result!.confidence).toBe(92);
    });
  });

  describe('Whitelist Normalization Verification', () => {
    test('should use exact mapping for 009 code without normalization', () => {
      const result = parser.parseModelNumber('LSU009HSV4');
      
      expect(result).not.toBeNull();
      expect(result!.btuCapacity).toBe(9000);
      expect(result!.manufacturer).toBe('LG');
    });

    test('should normalize 3-digit codes only for whitelisted small capacities', () => {
      // Test that 009 (whitelisted) gets normalized to 09 if needed
      const result = parser.parseModelNumber('MSZ-009NA');
      
      expect(result).not.toBeNull();
      expect(result!.btuCapacity).toBe(9000);
      expect(result!.manufacturer).toBe('Mitsubishi');
    });

    test('should NOT normalize large capacity codes like 090/120/180/240', () => {
      // These should use exact mapping, not normalization
      const lgResult = parser.parseModelNumber('LSU090HSV4');
      const mitsuResult = parser.parseModelNumber('MSZ-090NA');
      
      expect(lgResult!.btuCapacity).toBe(90000);
      expect(mitsuResult!.btuCapacity).toBe(90000);
    });

    test('should reject non-whitelisted normalization attempts', () => {
      // Try a capacity code that's not in whitelist for normalization
      const result = parser.parseModelNumber('LSU045HSV4');
      
      // Should fail because 045 is not in asian mapping and not in whitelist
      expect(result).toBeNull();
    });
  });

  describe('Asian Manufacturer Pattern Conflicts Prevention', () => {
    test('should correctly identify LG vs other manufacturers with similar patterns', () => {
      const lgResult = parser.parseModelNumber('LSU120HSV4');
      const nonLgResult = parser.parseModelNumber('TSU120HSV4'); // Not an LG prefix
      
      expect(lgResult!.manufacturer).toBe('LG');
      expect(nonLgResult).toBeNull();
    });

    test('should correctly identify Mitsubishi vs other manufacturers', () => {
      const mitsuResult = parser.parseModelNumber('MSZ-120NA');
      const nonMitsuResult = parser.parseModelNumber('BSZ-120NA'); // Not a Mitsubishi prefix
      
      expect(mitsuResult!.manufacturer).toBe('Mitsubishi');
      expect(nonMitsuResult).toBeNull();
    });
  });

  describe('System Type Detection for Asian Manufacturers', () => {
    test('should correctly identify LG Heat Pump models', () => {
      const heatPumpResult1 = parser.parseModelNumber('LSU120HSV4');
      const heatPumpResult2 = parser.parseModelNumber('LSN090HV4');
      
      expect(heatPumpResult1!.systemType).toBe('Heat Pump');
      expect(heatPumpResult2!.systemType).toBe('Heat Pump');
    });

    test('should correctly identify LG Straight A/C models', () => {
      const acResult = parser.parseModelNumber('LSA120HSV4');
      
      expect(acResult!.systemType).toBe('Straight A/C');
    });

    test('should correctly identify Mitsubishi Heat Pump models', () => {
      const heatPumpResult1 = parser.parseModelNumber('MSZ-120NA');
      const heatPumpResult2 = parser.parseModelNumber('PLA-A120AA4');
      
      expect(heatPumpResult1!.systemType).toBe('Heat Pump');
      expect(heatPumpResult2!.systemType).toBe('Heat Pump');
    });

    test('should correctly identify Mitsubishi Straight A/C models', () => {
      const acResult1 = parser.parseModelNumber('MLZ-120VF');
      const acResult2 = parser.parseModelNumber('MUZ-120NA');
      
      expect(acResult1!.systemType).toBe('Straight A/C');
      expect(acResult2!.systemType).toBe('Straight A/C');
    });
  });

  describe('Specifications Validation for Asian Manufacturers', () => {
    test('should provide correct specifications for LG units', () => {
      const result = parser.parseModelNumber('LSU120HSV4');
      
      expect(result!.specifications).toEqual([
        { label: "SEER2 Rating", value: "19.0" },
        { label: "Refrigerant", value: "R-410A" },
        { label: "Sound Level", value: "65", unit: "dB" },
        { label: "Application", value: "Mini-Split" }
      ]);
    });

    test('should provide correct specifications for Mitsubishi units', () => {
      const result = parser.parseModelNumber('MSZ-120NA');
      
      expect(result!.specifications).toEqual([
        { label: "SEER2 Rating", value: "22.0" },
        { label: "Refrigerant", value: "R-410A" },
        { label: "Sound Level", value: "58", unit: "dB" },
        { label: "Application", value: "Mini-Split" }
      ]);
    });
  });

  describe('Edge Case Pattern Variations', () => {
    test('should handle various LG model number formats', () => {
      const formats = [
        'LSU120HSV4',
        'LSN090HV4', 
        'LSA180HSV4',
        'LFU240HSV4'
      ];
      
      formats.forEach(format => {
        const result = parser.parseModelNumber(format);
        expect(result).not.toBeNull();
        expect(result!.manufacturer).toBe('LG');
      });
    });

    test('should handle various Mitsubishi model number formats', () => {
      const formats = [
        'MSZ-FE120NA',
        'PLA-A090AA4',
        'MLZ-KP180VF',
        'MUZ-GL240NA'
      ];
      
      formats.forEach(format => {
        const result = parser.parseModelNumber(format);
        expect(result).not.toBeNull();
        expect(result!.manufacturer).toBe('Mitsubishi');
      });
    });
  });

  describe('Confidence Scoring Validation', () => {
    test('should assign correct confidence scores for Asian manufacturers', () => {
      const lgResult = parser.parseModelNumber('LSU120HSV4');
      const mitsuResult = parser.parseModelNumber('MSZ-120NA');
      
      expect(lgResult!.confidence).toBe(88);
      expect(mitsuResult!.confidence).toBe(92);
    });
  });
});