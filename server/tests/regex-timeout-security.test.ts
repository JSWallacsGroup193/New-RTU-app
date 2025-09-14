import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { 
  PatternValidator, 
  patternValidator, 
  safePatternTest, 
  safePatternMatch,
  validateRegexPattern 
} from '../utils/patternValidator';
import { getRegexWorkerManager } from '../utils/regexWorker';

// ============================================================================
// CRITICAL SECURITY TESTS FOR REGEX TIMEOUT ENFORCEMENT
// ============================================================================

describe('Regex Timeout Security Tests', () => {
  let workerManager: any;

  beforeAll(() => {
    workerManager = getRegexWorkerManager();
  });

  afterAll(() => {
    // Clean up workers after tests
    workerManager?.shutdown();
  });

  describe('ReDoS Attack Prevention', () => {
    // Known catastrophic backtracking patterns that would cause ReDoS
    const maliciousPatterns = [
      {
        name: 'Nested Quantifiers Attack',
        pattern: '^(a+)+$',
        input: 'a'.repeat(30) + 'b', // Will cause exponential backtracking
        expectedTimeoutMs: 1000
      },
      {
        name: 'Evil Alternation Attack',
        pattern: '^(a|a)*$',
        input: 'a'.repeat(25) + 'b',
        expectedTimeoutMs: 1000
      },
      {
        name: 'Exponential Backtracking Attack',
        pattern: '^(a+b|a+c|a+d)*$',
        input: 'a'.repeat(20) + 'x',
        expectedTimeoutMs: 1000
      },
      {
        name: 'Complex Nested Groups Attack',
        pattern: '^((a+)*)+$',
        input: 'a'.repeat(25) + 'b',
        expectedTimeoutMs: 1000
      },
      {
        name: 'Overlapping Alternation Attack',
        pattern: '^(a|a|b)*c$',
        input: 'a'.repeat(30) + 'x',
        expectedTimeoutMs: 1000
      }
    ];

    maliciousPatterns.forEach(({ name, pattern, input, expectedTimeoutMs }) => {
      it(`should timeout for ${name} within ${expectedTimeoutMs}ms`, async () => {
        const startTime = Date.now();
        
        try {
          const result = await safePatternTest(pattern, input);
          const executionTime = Date.now() - startTime;
          
          // Test should complete quickly due to timeout
          expect(executionTime).toBeLessThan(expectedTimeoutMs + 500); // 500ms buffer for overhead
          
          // Result should be false (no match due to timeout or invalid pattern)
          expect(result).toBe(false);
          
          console.log(`✓ ${name}: Executed in ${executionTime}ms (timeout enforced)`);
          
        } catch (error) {
          const executionTime = Date.now() - startTime;
          
          // Even if error thrown, should be quick
          expect(executionTime).toBeLessThan(expectedTimeoutMs + 500);
          
          console.log(`✓ ${name}: Failed safely in ${executionTime}ms`);
        }
      }, 10000); // 10 second Jest timeout (much longer than our expected 1s timeout)
    });

    it('should handle safe patterns normally', async () => {
      const safePattern = '^[A-Z]{2,4}[0-9]{2,6}$';
      const validInput = 'ABC123';
      const invalidInput = 'invalid123!';
      
      const startTime = Date.now();
      
      const validResult = await safePatternTest(safePattern, validInput);
      const invalidResult = await safePatternTest(safePattern, invalidInput);
      
      const executionTime = Date.now() - startTime;
      
      // Safe patterns should execute very quickly
      expect(executionTime).toBeLessThan(100);
      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });
  });

  describe('Pattern Validation Security', () => {
    it('should reject patterns with high complexity', () => {
      const complexPattern = '((((a+)*)+)*)+'; // Very high complexity
      const validation = validateRegexPattern(complexPattern);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringMatching(/complexity|ReDoS|quantifier/i));
    });

    it('should reject patterns with nested quantifiers', () => {
      const nestedQuantifierPattern = '(a+)+';
      const validation = validateRegexPattern(nestedQuantifierPattern);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringMatching(/backtracking|ReDoS/i));
    });

    it('should reject patterns with excessive alternation branches', () => {
      const excessiveAlternationPattern = '(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t)';
      const validation = validateRegexPattern(excessiveAlternationPattern);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringMatching(/alternation branches/i));
    });

    it('should accept safe patterns', () => {
      const safePattern = '^[A-Z0-9]{3,10}$';
      const validation = validateRegexPattern(safePattern);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Worker Thread Isolation', () => {
    it('should properly isolate regex execution in workers', async () => {
      const testPattern = '^test[0-9]+$';
      const testInput = 'test123';
      
      // Test multiple concurrent operations
      const promises = Array.from({ length: 5 }, (_, i) =>
        safePatternTest(testPattern, `test${i}`)
      );
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });

    it('should handle worker errors gracefully', async () => {
      // Test with an invalid pattern that would cause worker error
      const invalidPattern = '['; // Unclosed bracket
      const testInput = 'test';
      
      const result = await safePatternTest(invalidPattern, testInput);
      
      // Should return false instead of throwing
      expect(result).toBe(false);
    });

    it('should cleanup workers properly', async () => {
      // Test that workers are cleaned up
      const testPattern = '^cleanup[0-9]+$';
      const testInput = 'cleanup123';
      
      await safePatternTest(testPattern, testInput);
      
      // Check that worker manager can shutdown cleanly
      expect(() => {
        workerManager.shutdown();
      }).not.toThrow();
    });
  });

  describe('Safe Pattern Matching', () => {
    it('should timeout safely during match operations', async () => {
      const maliciousPattern = '^(a+)+$';
      const maliciousInput = 'a'.repeat(25) + 'b';
      
      const startTime = Date.now();
      const result = await safePatternMatch(maliciousPattern, maliciousInput);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(1500); // Should timeout within 1s + buffer
      expect(result).toBeNull(); // Should return null for timeout/error
    });

    it('should return proper matches for safe patterns', async () => {
      const safePattern = '^([A-Z]+)([0-9]+)$';
      const validInput = 'ABC123';
      
      const result = await safePatternMatch(safePattern, validInput);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('ABC123'); // Full match
      expect(result![1]).toBe('ABC'); // First group
      expect(result![2]).toBe('123'); // Second group
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle multiple concurrent safe operations efficiently', async () => {
      const safePattern = '^[A-Z]{3}[0-9]{3}$';
      const inputs = Array.from({ length: 20 }, (_, i) => `ABC${String(i).padStart(3, '0')}`);
      
      const startTime = Date.now();
      
      const promises = inputs.map(input => safePatternTest(safePattern, input));
      const results = await Promise.all(promises);
      
      const executionTime = Date.now() - startTime;
      
      // Should complete all 20 operations quickly
      expect(executionTime).toBeLessThan(2000);
      
      // All should match
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });

    it('should limit resource usage under attack', async () => {
      const maliciousPattern = '^(a+)+$';
      const maliciousInput = 'a'.repeat(20) + 'b';
      
      // Try to overwhelm with multiple malicious operations
      const promises = Array.from({ length: 10 }, () =>
        safePatternTest(maliciousPattern, maliciousInput)
      );
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const executionTime = Date.now() - startTime;
      
      // Should not take too long even with multiple malicious patterns
      expect(executionTime).toBeLessThan(5000);
      
      // All should fail/timeout safely
      results.forEach(result => {
        expect(result).toBe(false);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty patterns safely', async () => {
      const result = await safePatternTest('', 'test');
      expect(result).toBe(false);
    });

    it('should handle extremely long inputs safely', async () => {
      const pattern = '^test.*$';
      const longInput = 'test' + 'a'.repeat(10000);
      
      const startTime = Date.now();
      const result = await safePatternTest(pattern, longInput);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(2000);
      expect(typeof result).toBe('boolean');
    });

    it('should handle null and undefined inputs gracefully', async () => {
      const pattern = '^test$';
      
      // These should be handled gracefully by the validator
      await expect(safePatternTest(pattern, null as any)).resolves.toBe(false);
      await expect(safePatternTest(pattern, undefined as any)).resolves.toBe(false);
    });
  });

  describe('Compatibility and API Consistency', () => {
    it('should maintain consistent API behavior', async () => {
      const validator = new PatternValidator();
      const pattern = '^[A-Z]{3}[0-9]{3}$';
      const input = 'ABC123';
      
      // Test both direct validator usage and helper functions
      const validatorResult = await validator.safeTest(pattern, input);
      const helperResult = await safePatternTest(pattern, input);
      
      expect(validatorResult.matches).toBe(helperResult);
      expect(validatorResult.timedOut).toBe(false);
      expect(validatorResult.error).toBeUndefined();
    });

    it('should provide proper timeout information', async () => {
      const validator = new PatternValidator();
      const maliciousPattern = '^(a+)+$';
      const maliciousInput = 'a'.repeat(20) + 'b';
      
      const result = await validator.safeTest(maliciousPattern, maliciousInput);
      
      // Should either timeout or be rejected as invalid
      if (result.timedOut) {
        expect(result.matches).toBe(false);
      } else {
        // Pattern should be rejected as invalid during validation
        expect(result.error).toBeDefined();
      }
    });
  });
});

// ============================================================================
// INTEGRATION TESTS WITH ACTUAL HVAC PATTERNS
// ============================================================================

describe('HVAC Pattern Safety Integration', () => {
  const hvacPatterns = [
    {
      name: 'Daikin Model Pattern',
      pattern: '^[A-Z]{2,4}[0-9]{2,6}[A-Z]{0,3}$',
      validInputs: ['ABC123', 'DKIN1234AB', 'XY99'],
      invalidInputs: ['abc123', '123ABC', 'TOOLONG1234567']
    },
    {
      name: 'Carrier Model Pattern',
      pattern: '^[0-9]{2}[A-Z]{2,4}[0-9]{3,6}$',
      validInputs: ['25HCB306', '50TCQ012', '99ABC123456'],
      invalidInputs: ['ABC123', '1A123', '99TOOLONG123']
    }
  ];

  hvacPatterns.forEach(({ name, pattern, validInputs, invalidInputs }) => {
    describe(name, () => {
      it('should validate safely and correctly', async () => {
        // Test valid inputs
        for (const input of validInputs) {
          const result = await safePatternTest(pattern, input);
          expect(result).toBe(true);
        }

        // Test invalid inputs
        for (const input of invalidInputs) {
          const result = await safePatternTest(pattern, input);
          expect(result).toBe(false);
        }
      });

      it('should extract matches correctly', async () => {
        for (const input of validInputs) {
          const match = await safePatternMatch(pattern, input);
          expect(match).not.toBeNull();
          expect(match![0]).toBe(input);
        }
      });

      it('should complete within reasonable time', async () => {
        const startTime = Date.now();
        
        const promises = [...validInputs, ...invalidInputs].map(input =>
          safePatternTest(pattern, input)
        );
        
        await Promise.all(promises);
        
        const executionTime = Date.now() - startTime;
        expect(executionTime).toBeLessThan(1000); // Should be very fast for real patterns
      });
    });
  });
});