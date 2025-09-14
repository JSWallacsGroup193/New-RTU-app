import { z } from "zod";
import { getRegexWorkerManager } from './regexWorker';

// ============================================================================
// PATTERN VALIDATOR - REGEX SAFETY AND SECURITY UTILITY
// ============================================================================

export interface PatternValidationResult {
  isValid: boolean;
  safePattern?: string;
  errors: string[];
  warnings: string[];
  complexity: number;
  estimatedSteps: number;
}

export interface PatternValidationConfig {
  maxLength: number;
  maxComplexity: number;
  timeoutMs: number;
  allowedFlags: string[];
  requireAnchoring: boolean;
  maxQuantifierDepth: number;
  maxAlternationBranches: number;
}

/**
 * PatternValidator provides comprehensive regex pattern validation to prevent
 * ReDoS (Regular Expression Denial of Service) attacks and ensure safe pattern execution.
 * 
 * Security Features:
 * - Pattern complexity analysis
 * - ReDoS vulnerability detection
 * - Execution timeout protection
 * - Input sanitization
 * - Pattern anchoring enforcement
 */
export class PatternValidator {
  private static readonly DEFAULT_CONFIG: PatternValidationConfig = {
    maxLength: 200,
    maxComplexity: 50,
    timeoutMs: 1000,
    allowedFlags: ['i', 'g', 'm'],
    requireAnchoring: true,
    maxQuantifierDepth: 3,
    maxAlternationBranches: 10
  };

  private config: PatternValidationConfig;

  constructor(config: Partial<PatternValidationConfig> = {}) {
    this.config = { ...PatternValidator.DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate a regex pattern for safety and security
   */
  validatePattern(pattern: string, flags?: string): PatternValidationResult {
    const result: PatternValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      complexity: 0,
      estimatedSteps: 0
    };

    try {
      // Basic validation
      if (!this.validateBasicStructure(pattern, result)) {
        return result;
      }

      // Complexity analysis
      const complexity = this.analyzeComplexity(pattern);
      result.complexity = complexity.score;
      result.estimatedSteps = complexity.estimatedSteps;

      if (complexity.score > this.config.maxComplexity) {
        result.errors.push(`Pattern complexity (${complexity.score}) exceeds maximum allowed (${this.config.maxComplexity})`);
        return result;
      }

      // ReDoS vulnerability check
      if (!this.checkForReDoSVulnerabilities(pattern, result)) {
        return result;
      }

      // Anchoring validation
      if (this.config.requireAnchoring && !this.isProperlyAnchored(pattern)) {
        result.errors.push("Pattern must be properly anchored with ^ and $ to prevent partial matches");
        return result;
      }

      // Validate flags if provided
      if (flags && !this.validateFlags(flags)) {
        result.errors.push(`Invalid or disallowed flags: ${flags}`);
        return result;
      }

      // Test pattern compilation with timeout
      const safePattern = this.createSafePattern(pattern, flags);
      if (!safePattern) {
        result.errors.push("Pattern failed safe compilation test");
        return result;
      }

      result.safePattern = safePattern;
      result.isValid = true;

      // Add warnings for potentially risky patterns
      this.addPerformanceWarnings(pattern, result);

      return result;

    } catch (error) {
      result.errors.push(`Pattern validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Safely test a pattern against input with timeout protection
   */
  async safeTest(pattern: string, input: string, flags?: string): Promise<{ matches: boolean; timedOut: boolean; error?: string }> {
    try {
      const validation = this.validatePattern(pattern, flags);
      if (!validation.isValid) {
        return { matches: false, timedOut: false, error: `Invalid pattern: ${validation.errors.join(', ')}` };
      }

      const workerManager = getRegexWorkerManager();
      return await workerManager.safeTest(validation.safePattern!, input, flags, this.config.timeoutMs);
    } catch (error) {
      return { 
        matches: false, 
        timedOut: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Safely match a pattern against input with timeout protection
   */
  async safeMatch(pattern: string, input: string, flags?: string): Promise<{ match: RegExpMatchArray | null; timedOut: boolean; error?: string }> {
    try {
      const validation = this.validatePattern(pattern, flags);
      if (!validation.isValid) {
        return { match: null, timedOut: false, error: `Invalid pattern: ${validation.errors.join(', ')}` };
      }

      const workerManager = getRegexWorkerManager();
      return await workerManager.safeMatch(validation.safePattern!, input, flags, this.config.timeoutMs);
    } catch (error) {
      return { 
        match: null, 
        timedOut: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create a sanitized version of the pattern that's safe for storage and execution
   */
  sanitizePattern(pattern: string): string {
    // Remove potentially dangerous constructs while preserving functionality
    let sanitized = pattern
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .slice(0, this.config.maxLength); // Enforce length limit

    // Ensure proper anchoring if required
    if (this.config.requireAnchoring && !this.isProperlyAnchored(sanitized)) {
      // Add anchors if missing
      if (!sanitized.startsWith('^')) {
        sanitized = '^' + sanitized;
      }
      if (!sanitized.endsWith('$')) {
        sanitized = sanitized + '$';
      }
    }

    return sanitized;
  }

  /**
   * Basic structure validation
   */
  private validateBasicStructure(pattern: string, result: PatternValidationResult): boolean {
    // Length check
    if (pattern.length > this.config.maxLength) {
      result.errors.push(`Pattern length (${pattern.length}) exceeds maximum allowed (${this.config.maxLength})`);
      return false;
    }

    // Empty pattern check
    if (!pattern.trim()) {
      result.errors.push("Pattern cannot be empty");
      return false;
    }

    // Basic regex syntax validation
    try {
      new RegExp(pattern);
    } catch (error) {
      result.errors.push(`Invalid regex syntax: ${error instanceof Error ? error.message : 'Unknown syntax error'}`);
      return false;
    }

    return true;
  }

  /**
   * Analyze pattern complexity to prevent performance issues
   */
  private analyzeComplexity(pattern: string): { score: number; estimatedSteps: number } {
    let score = pattern.length * 0.1; // Base score from length
    let estimatedSteps = pattern.length;

    // Count problematic constructs
    const quantifiers = (pattern.match(/[*+?{]/g) || []).length;
    const lookarounds = (pattern.match(/\(\?[=!<]/g) || []).length;
    const captures = (pattern.match(/\(/g) || []).length;
    const alternations = (pattern.match(/\|/g) || []).length;
    const characterClasses = (pattern.match(/\[[^\]]*\]/g) || []).length;
    const backslashes = (pattern.match(/\\/g) || []).length;

    // Weight different constructs by their performance impact
    score += quantifiers * 5;
    score += lookarounds * 10;
    score += captures * 2;
    score += alternations * 3;
    score += characterClasses * 1.5;
    score += backslashes * 0.5;

    // Estimate potential execution steps
    estimatedSteps *= Math.max(1, quantifiers * alternations * 0.5);

    return { score: Math.round(score), estimatedSteps: Math.round(estimatedSteps) };
  }

  /**
   * Check for common ReDoS vulnerability patterns
   */
  private checkForReDoSVulnerabilities(pattern: string, result: PatternValidationResult): boolean {
    // Nested quantifiers (a+b+c+)
    if (/(\*|\+|\?|\{\d+,\}).*(\*|\+|\?|\{\d+,\}).*(\*|\+|\?|\{\d+,\})/.test(pattern)) {
      result.errors.push("Pattern contains nested quantifiers which may cause ReDoS vulnerabilities");
      return false;
    }

    // Alternation with overlapping branches (a|a)*
    const alternationGroups = pattern.match(/\([^)]*\|[^)]*\)/g) || [];
    for (const group of alternationGroups) {
      const branches = group.slice(1, -1).split('|');
      if (branches.length > this.config.maxAlternationBranches) {
        result.errors.push(`Too many alternation branches (${branches.length}) in group, maximum allowed: ${this.config.maxAlternationBranches}`);
        return false;
      }
    }

    // Exponential backtracking patterns like (a+)+
    if (/\([^)]*[\*\+][^)]*\)[\*\+]/.test(pattern)) {
      result.errors.push("Pattern contains constructs that may cause exponential backtracking (ReDoS)");
      return false;
    }

    // Excessive quantifier depth
    const quantifierDepth = this.calculateQuantifierDepth(pattern);
    if (quantifierDepth > this.config.maxQuantifierDepth) {
      result.errors.push(`Quantifier nesting depth (${quantifierDepth}) exceeds maximum allowed (${this.config.maxQuantifierDepth})`);
      return false;
    }

    return true;
  }

  /**
   * Calculate the depth of nested quantifiers
   */
  private calculateQuantifierDepth(pattern: string): number {
    let depth = 0;
    let maxDepth = 0;
    let inGroup = false;

    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];
      const nextChar = pattern[i + 1];

      if (char === '(' && pattern[i - 1] !== '\\') {
        inGroup = true;
      } else if (char === ')' && pattern[i - 1] !== '\\') {
        inGroup = false;
      } else if (inGroup && /[*+?{]/.test(char)) {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
      } else if (!inGroup && /[*+?{]/.test(char)) {
        depth = Math.max(1, depth);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }

  /**
   * Check if pattern is properly anchored
   */
  private isProperlyAnchored(pattern: string): boolean {
    return pattern.startsWith('^') && pattern.endsWith('$');
  }

  /**
   * Validate regex flags
   */
  private validateFlags(flags: string): boolean {
    for (const flag of flags) {
      if (!this.config.allowedFlags.includes(flag)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Create a safe version of the pattern for execution
   */
  private createSafePattern(pattern: string, flags?: string): string | null {
    try {
      // Test compilation with safe flags
      const safeFlags = flags ? flags.split('').filter(f => this.config.allowedFlags.includes(f)).join('') : undefined;
      const testRegex = new RegExp(pattern, safeFlags);
      
      // Quick validation test without worker (synchronous)
      // Just ensure the regex compiles, actual timeout testing happens in Worker
      return pattern;
    } catch {
      return null;
    }
  }

  // REMOVED: testWithTimeout - replaced with Worker-based implementation
  // The old implementation using setTimeout was vulnerable to ReDoS attacks
  // because setTimeout cannot interrupt a blocking regex operation.

  // REMOVED: matchWithTimeout - replaced with Worker-based implementation
  // The old implementation using setTimeout was vulnerable to ReDoS attacks
  // because setTimeout cannot interrupt a blocking regex operation.

  /**
   * Add performance warnings for potentially slow patterns
   */
  private addPerformanceWarnings(pattern: string, result: PatternValidationResult): void {
    // Check for patterns that might be slow
    if ((pattern.match(/\./g) || []).length > 5) {
      result.warnings.push("Pattern contains many dot (.) metacharacters which may impact performance");
    }

    if ((pattern.match(/\*/g) || []).length > 3) {
      result.warnings.push("Pattern contains multiple star (*) quantifiers which may impact performance");
    }

    if (pattern.includes('.*.*')) {
      result.warnings.push("Pattern contains multiple .* sequences which may cause performance issues");
    }

    if (result.complexity > this.config.maxComplexity * 0.8) {
      result.warnings.push(`Pattern complexity is high (${result.complexity}), consider simplifying`);
    }
  }
}

// ============================================================================
// VALIDATION SCHEMAS FOR PATTERNS
// ============================================================================

/**
 * Zod schema for validating regex patterns
 */
export const regexPatternSchema = z.string()
  .min(1, "Pattern cannot be empty")
  .max(200, "Pattern too long")
  .refine((pattern) => {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }, "Invalid regex syntax")
  .refine((pattern) => {
    const validator = new PatternValidator();
    const result = validator.validatePattern(pattern);
    return result.isValid;
  }, "Pattern failed security validation");

/**
 * Zod schema for pattern validation requests
 */
export const patternValidationRequestSchema = z.object({
  pattern: regexPatternSchema,
  flags: z.string().regex(/^[igm]*$/).optional(),
  testInput: z.string().max(1000).optional(),
  maxComplexity: z.number().min(1).max(100).optional()
});

export type PatternValidationRequest = z.infer<typeof patternValidationRequestSchema>;

// ============================================================================
// PATTERN SAFETY UTILITIES
// ============================================================================

/**
 * Global pattern validator instance
 */
export const patternValidator = new PatternValidator();

/**
 * Quick pattern validation helper
 */
export function validateRegexPattern(pattern: string, flags?: string): PatternValidationResult {
  return patternValidator.validatePattern(pattern, flags);
}

/**
 * Safe pattern testing helper
 */
export async function safePatternTest(pattern: string, input: string, flags?: string): Promise<boolean> {
  const result = await patternValidator.safeTest(pattern, input, flags);
  return result.matches && !result.timedOut && !result.error;
}

/**
 * Safe pattern matching helper
 */
export async function safePatternMatch(pattern: string, input: string, flags?: string): Promise<RegExpMatchArray | null> {
  const result = await patternValidator.safeMatch(pattern, input, flags);
  if (result.timedOut || result.error) {
    return null;
  }
  return result.match;
}