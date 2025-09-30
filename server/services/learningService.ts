import type { 
  UserCorrection, 
  PatternLearning, 
  MatchFeedback, 
  ParsedModel,
  ManufacturerPattern,
  LearningMetric,
  InsertPatternLearning,
  InsertManufacturerPattern,
  InsertLearningMetric
} from "@shared/schema";
import type { IStorage } from "../storage";
import { 
  PatternValidator, 
  patternValidator, 
  validateRegexPattern, 
  safePatternTest,
  safePatternMatch
} from "../utils/patternValidator";

export interface PatternLearningContext {
  corrections: UserCorrection[];
  confidence: number;
  successRate: number;
  usageCount: number;
}

export interface LearningAnalysis {
  shouldCreateNewPattern: boolean;
  shouldUpdateExistingPattern: boolean;
  patternId?: string;
  confidence: number;
  suggestedPattern?: string;
  extractionRules?: any;
}

/**
 * LearningService processes user corrections and feedback to continuously improve
 * the HVAC model parsing and matching capabilities of the domain brain.
 */
export class LearningService {
  private storage: IStorage;
  private learningVersion: number = 1;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Process a user correction to improve parsing patterns
   */
  async processUserCorrection(correction: UserCorrection): Promise<{
    success: boolean;
    newPatternCreated?: boolean;
    patternUpdated?: boolean;
    patternId?: string;
    confidence: number;
  }> {
    try {
      // Analyze the correction to determine learning actions
      const analysis = await this.analyzeCorrection(correction);
      
      // Apply learning based on analysis
      const result = await this.applyLearningFromCorrection(correction, analysis);
      
      // Update correction record to mark it as processed
      await this.storage.markCorrectionAppliedToPattern(
        correction.id, 
        this.learningVersion
      );
      
      // Record learning metrics
      await this.recordLearningMetric("correction_processed", {
        successRate: result.confidence,
        correctionType: correction.correctionType,
        manufacturer: this.extractManufacturer(correction.originalParsedData)
      });
      
      return result;
      
    } catch (error) {
      console.error("Error processing user correction:", error);
      throw new Error("Failed to process user correction");
    }
  }

  /**
   * Process match feedback to improve suggestion quality
   */
  async processMatchFeedback(feedback: MatchFeedback): Promise<{
    success: boolean;
    matcherImproved: boolean;
    satisfactionScore: number;
  }> {
    try {
      // Analyze feedback quality and patterns
      const satisfactionScore = this.calculateSatisfactionScore(feedback);
      
      // Learn from feedback patterns
      await this.learnFromMatchFeedback(feedback);
      
      // Mark feedback as processed
      await this.storage.markFeedbackAppliedToMatcher(
        feedback.id, 
        this.learningVersion
      );
      
      // Record metrics
      await this.recordLearningMetric("feedback_processed", {
        successRate: satisfactionScore,
        feedbackType: feedback.feedbackType,
        userSatisfactionAvg: satisfactionScore
      });
      
      return {
        success: true,
        matcherImproved: satisfactionScore > 0.7,
        satisfactionScore
      };
      
    } catch (error) {
      console.error("Error processing match feedback:", error);
      throw new Error("Failed to process match feedback");
    }
  }

  /**
   * Analyze a correction to determine what learning actions to take
   */
  private async analyzeCorrection(correction: UserCorrection): Promise<LearningAnalysis> {
    const manufacturer = this.extractManufacturer(correction.originalParsedData);
    
    // Get existing patterns for this manufacturer
    const existingPatterns = await this.storage.getActivePatternsByManufacturer(manufacturer);
    
    // Get similar corrections for this model
    const similarCorrections = await this.storage.getUserCorrectionsByModelNumber(
      correction.originalModelNumber
    );
    
    // Analyze if we should create a new pattern or update existing ones
    const analysis: LearningAnalysis = {
      shouldCreateNewPattern: false,
      shouldUpdateExistingPattern: false,
      confidence: correction.confidence || 0.8
    };
    
    // If we have multiple corrections for similar models, consider creating/updating patterns
    if (similarCorrections.length >= 2) {
      const consistentCorrections = this.findConsistentCorrections(similarCorrections);
      
      if (consistentCorrections.length >= 2) {
        // Find if existing pattern matches
        const matchingPattern = await this.findMatchingPattern(
          correction.originalModelNumber, 
          existingPatterns
        );
        
        if (matchingPattern) {
          analysis.shouldUpdateExistingPattern = true;
          analysis.patternId = matchingPattern.id;
          analysis.confidence = Math.min(0.9, analysis.confidence + 0.1);
        } else {
          analysis.shouldCreateNewPattern = true;
          analysis.suggestedPattern = this.generatePatternFromCorrections(consistentCorrections);
          analysis.extractionRules = this.generateExtractionRulesFromCorrections(consistentCorrections);
        }
      }
    }
    
    return analysis;
  }

  /**
   * Apply learning actions based on analysis
   */
  private async applyLearningFromCorrection(
    correction: UserCorrection, 
    analysis: LearningAnalysis
  ): Promise<{
    success: boolean;
    newPatternCreated?: boolean;
    patternUpdated?: boolean;
    patternId?: string;
    confidence: number;
  }> {
    const manufacturer = this.extractManufacturer(correction.originalParsedData);
    
    if (analysis.shouldCreateNewPattern && analysis.suggestedPattern) {
      // Create new manufacturer pattern
      const newPattern = await this.storage.createManufacturerPattern({
        manufacturer,
        patternName: `Learned_${correction.correctionType}_${Date.now()}`,
        regexPattern: analysis.suggestedPattern,
        extractionRules: analysis.extractionRules || {},
        description: `Pattern learned from user correction: ${correction.correctionType}`,
        examples: [correction.originalModelNumber],
        learnedFromModelNumbers: [correction.originalModelNumber],
        confidence: analysis.confidence,
        isLearned: true,
        isActive: true
      });
      
      return {
        success: true,
        newPatternCreated: true,
        patternId: newPattern.id,
        confidence: analysis.confidence
      };
    }
    
    if (analysis.shouldUpdateExistingPattern && analysis.patternId) {
      // Update existing pattern with new learning
      const existingPattern = await this.storage.getManufacturerPatternById(analysis.patternId);
      if (existingPattern) {
        // Increment success count and update confidence
        await this.storage.incrementPatternMatchCount(analysis.patternId, true);
        
        // Update pattern examples
        const updatedExamples = [
          ...(existingPattern.examples as string[] || []), 
          correction.originalModelNumber
        ];
        
        await this.storage.updateManufacturerPattern(analysis.patternId, {
          examples: updatedExamples,
          confidence: Math.min(0.95, (existingPattern.confidence || 0.5) + 0.05)
        });
        
        return {
          success: true,
          patternUpdated: true,
          patternId: analysis.patternId,
          confidence: analysis.confidence
        };
      }
    }
    
    // No pattern changes, but still successful processing
    return {
      success: true,
      confidence: analysis.confidence
    };
  }

  /**
   * Learn from match feedback to improve suggestion quality
   */
  private async learnFromMatchFeedback(feedback: MatchFeedback): Promise<void> {
    const manufacturer = this.extractManufacturer(feedback.parsedSpecs);
    
    // Create pattern learning entry for feedback
    const patternData: InsertPatternLearning = {
      manufacturer,
      patternType: "feedback_learning",
      version: this.learningVersion,
      isActive: true,
      patternDefinition: {
        feedbackType: feedback.feedbackType,
        originalModel: feedback.originalModelNumber,
        chosenMatch: feedback.chosenMatchId,
        rating: feedback.feedbackRating
      },
      parsingLogic: {
        matchPreferences: this.extractMatchPreferences(feedback),
        qualityThresholds: this.calculateQualityThresholds(feedback)
      },
      successRate: this.calculateSatisfactionScore(feedback),
      confidenceScore: feedback.userSatisfactionScore || 0.5,
      learnedFromCorrections: []
    };
    
    await this.storage.createPatternLearning(patternData);
  }

  /**
   * Find corrections that are consistent with each other
   */
  private findConsistentCorrections(corrections: UserCorrection[]): UserCorrection[] {
    // Group corrections by type and check for consistency
    const groupedByType = corrections.reduce((groups, correction) => {
      if (!groups[correction.correctionType]) {
        groups[correction.correctionType] = [];
      }
      groups[correction.correctionType].push(correction);
      return groups;
    }, {} as Record<string, UserCorrection[]>);
    
    // Find the largest consistent group
    let largestGroup: UserCorrection[] = [];
    for (const group of Object.values(groupedByType)) {
      if (group.length > largestGroup.length) {
        largestGroup = group;
      }
    }
    
    return largestGroup;
  }

  /**
   * Find matching pattern for a model number using secure pattern validation
   */
  private async findMatchingPattern(
    modelNumber: string, 
    patterns: ManufacturerPattern[]
  ): Promise<ManufacturerPattern | null> {
    // Sanitize input model number
    if (!modelNumber || typeof modelNumber !== 'string' || modelNumber.length > 100) {
      console.warn('Invalid model number provided for pattern matching');
      return null;
    }
    
    const sanitizedModelNumber = modelNumber.trim().slice(0, 100);
    
    for (const pattern of patterns) {
      try {
        // Validate pattern safety before using
        const validation = validateRegexPattern(pattern.regexPattern, 'i');
        
        if (!validation.isValid) {
          console.warn(`Unsafe regex pattern detected for pattern ${pattern.id}: ${validation.errors.join(', ')}`);
          // Flag pattern for review
          if (this.storage.flagPatternForReview) {
            await this.storage.flagPatternForReview(
              pattern.id, 
              `Security validation failed: ${validation.errors.join(', ')}`
            );
          }
          continue;
        }
        
        // Use safe pattern testing with timeout protection
        const testResult = await safePatternTest(pattern.regexPattern, sanitizedModelNumber, 'i');
        
        if (testResult) {
          // Increment pattern usage for successful match
          if (this.storage.incrementPatternMatchCount) {
            await this.storage.incrementPatternMatchCount(pattern.id, true);
          }
          return pattern;
        }
        
      } catch (error) {
        console.error(`Error testing pattern ${pattern.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Flag problematic pattern
        if (this.storage.flagPatternForReview) {
          await this.storage.flagPatternForReview(
            pattern.id, 
            `Pattern execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }
    return null;
  }

  /**
   * Generate a regex pattern from consistent corrections
   */
  private generatePatternFromCorrections(corrections: UserCorrection[]): string {
    if (corrections.length === 0) return ".*";
    
    const modelNumbers = corrections.map(c => c.originalModelNumber);
    return this.generatePatternFromModelNumbers(modelNumbers);
  }

  /**
   * Generate extraction rules from corrections
   */
  private generateExtractionRulesFromCorrections(corrections: UserCorrection[]): any {
    // Analyze the corrections to build extraction rules
    const rules: any = {
      capacityExtraction: { method: "regex_group", pattern: "(\\d{2,3})" },
      manufacturerExtraction: { method: "fixed_value" },
      systemTypeExtraction: { method: "pattern_match", patterns: {} }
    };
    
    // Learn patterns from corrections
    corrections.forEach(correction => {
      const corrected = correction.correctedParsedData as ParsedModel;
      
      if (correction.correctionType === "manufacturer_fix" && corrected.manufacturer) {
        rules.manufacturerExtraction.value = corrected.manufacturer;
      }
      
      if (correction.correctionType === "system_type_fix" && corrected.systemType) {
        // Extract pattern hints for system type
        const modelPart = this.extractSystemTypeHint(correction.originalModelNumber);
        if (modelPart) {
          rules.systemTypeExtraction.patterns[modelPart] = corrected.systemType;
        }
      }
    });
    
    return rules;
  }

  /**
   * Generate secure pattern from model numbers using common structure analysis
   */
  private generatePatternFromModelNumbers(modelNumbers: string[]): string {
    // Input validation and sanitization
    if (!Array.isArray(modelNumbers) || modelNumbers.length === 0) {
      return "^[A-Z0-9]{3,20}$"; // Safe fallback pattern
    }
    
    // Sanitize and validate input model numbers
    const sanitizedModelNumbers = modelNumbers
      .filter(model => typeof model === 'string' && model.trim().length > 0)
      .map(model => model.trim().slice(0, 50)) // Limit length
      .filter(model => /^[A-Z0-9\-_]+$/i.test(model)); // Only allow safe characters
    
    if (sanitizedModelNumbers.length === 0) {
      return "^[A-Z0-9]{3,20}$"; // Safe fallback pattern
    }
    
    // Limit the number of model numbers to analyze (prevent complexity attacks)
    const limitedModelNumbers = sanitizedModelNumbers.slice(0, 10);
    
    try {
      // Find common prefix with proper escaping
      let commonPrefix = "";
      let i = 0;
      const minLength = Math.min(...limitedModelNumbers.map(m => m.length));
      
      while (i < minLength && i < 20) { // Limit prefix analysis
        const char = limitedModelNumbers[0][i];
        if (limitedModelNumbers.every(model => model[i] === char)) {
          // Properly escape special regex characters
          commonPrefix += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          i++;
        } else {
          break;
        }
      }
      
      // Build secure pattern with limited complexity
      let pattern = "^" + commonPrefix;
      
      if (i < minLength) {
        // Add simple, safe patterns for variable parts
        const remainingLength = Math.min(15, minLength - i); // Limit remaining pattern length
        
        if (remainingLength > 0) {
          // Use safer, more specific patterns
          pattern += "[A-Z0-9]{1," + Math.min(remainingLength, 10) + "}"; // Alphanumeric characters
        }
      }
      
      pattern += "$";
      
      // Validate the generated pattern for safety
      const validation = validateRegexPattern(pattern);
      
      if (!validation.isValid) {
        console.warn('Generated pattern failed security validation, using safe fallback');
        return "^[A-Z0-9]{3,20}$"; // Safe fallback pattern
      }
      
      // Additional complexity check
      if (validation.complexity > 30) {
        console.warn('Generated pattern too complex, using safe fallback');
        return "^[A-Z0-9]{3,20}$"; // Safe fallback pattern
      }
      
      return pattern;
      
    } catch (error) {
      console.error('Error generating pattern from model numbers:', error);
      return "^[A-Z0-9]{3,20}$"; // Safe fallback pattern
    }
  }

  /**
   * Extract system type hint from model number
   */
  private extractSystemTypeHint(modelNumber: string): string | null {
    // Look for common system type indicators
    const heatPumpIndicators = ['HP', 'HC', 'HSP'];
    const acIndicators = ['AC', 'SC', 'SAC'];
    const gasElectricIndicators = ['GE', 'GAS', 'ELEC'];
    
    const upperModel = modelNumber.toUpperCase();
    
    for (const indicator of heatPumpIndicators) {
      if (upperModel.includes(indicator)) return indicator;
    }
    
    for (const indicator of acIndicators) {
      if (upperModel.includes(indicator)) return indicator;
    }
    
    for (const indicator of gasElectricIndicators) {
      if (upperModel.includes(indicator)) return indicator;
    }
    
    return null;
  }

  /**
   * Calculate satisfaction score from feedback
   */
  private calculateSatisfactionScore(feedback: MatchFeedback): number {
    let score = 0.5; // Default neutral score
    
    switch (feedback.feedbackType) {
      case "perfect_match":
        score = 1.0;
        break;
      case "good_match":
        score = 0.8;
        break;
      case "poor_match":
        score = 0.3;
        break;
      case "wrong_match":
        score = 0.1;
        break;
      case "user_rejected":
        score = 0.0;
        break;
    }
    
    // Adjust based on rating if provided
    if (feedback.feedbackRating) {
      const ratingScore = (feedback.feedbackRating - 1) / 4; // Convert 1-5 to 0-1
      score = (score + ratingScore) / 2; // Average the scores
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Extract match preferences from feedback
   */
  private extractMatchPreferences(feedback: MatchFeedback): any {
    return {
      preferredMatchType: feedback.feedbackType,
      chosenMatchId: feedback.chosenMatchId,
      rating: feedback.feedbackRating,
      comments: feedback.feedbackComments
    };
  }

  /**
   * Calculate quality thresholds based on feedback
   */
  private calculateQualityThresholds(feedback: MatchFeedback): any {
    const satisfaction = this.calculateSatisfactionScore(feedback);
    
    return {
      minimumSatisfaction: Math.max(0.5, satisfaction - 0.2),
      targetSatisfaction: satisfaction,
      capacityTolerance: satisfaction > 0.7 ? 0.1 : 0.2,
      specificationWeight: satisfaction > 0.8 ? 1.0 : 0.8
    };
  }

  /**
   * Extract manufacturer from parsed data
   */
  private extractManufacturer(parsedData: any): string {
    return parsedData?.manufacturer || "Unknown";
  }

  /**
   * Record a learning metric
   */
  private async recordLearningMetric(metricType: string, data: any): Promise<void> {
    const metric: InsertLearningMetric = {
      metricType,
      measurementDate: new Date(),
      periodType: "real_time",
      successRate: data.successRate || 0,
      errorRate: 1 - (data.successRate || 0),
      userSatisfactionAvg: data.userSatisfactionAvg,
      feedbackVolume: 1,
      newPatternsLearned: data.newPatternCreated ? 1 : 0,
      patternsImproved: data.patternUpdated ? 1 : 0
    };
    
    await this.storage.createLearningMetric(metric);
  }

  /**
   * Get learning insights for a manufacturer
   */
  async getLearningInsights(manufacturer: string): Promise<{
    totalCorrections: number;
    totalFeedback: number;
    averageAccuracy: number;
    topIssues: Array<{type: string; count: number}>;
    improvementTrend: "improving" | "stable" | "declining";
  }> {
    const corrections = await this.storage.getUserCorrections();
    const feedback = await this.storage.getMatchFeedback();
    const patterns = await this.storage.getActivePatternsByManufacturer(manufacturer);
    
    const manufacturerCorrections = corrections.filter(c => 
      this.extractManufacturer(c.originalParsedData) === manufacturer
    );
    
    const manufacturerFeedback = feedback.filter(f => 
      this.extractManufacturer(f.parsedSpecs) === manufacturer
    );
    
    // Calculate accuracy
    const totalSuccessful = patterns.reduce((sum, p) => sum + (p.successCount || 0), 0);
    const totalAttempts = patterns.reduce((sum, p) => sum + (p.matchCount || 0), 0);
    const averageAccuracy = totalAttempts > 0 ? totalSuccessful / totalAttempts : 0;
    
    // Find top issues
    const issueTypes: Record<string, number> = {};
    manufacturerCorrections.forEach(c => {
      issueTypes[c.correctionType] = (issueTypes[c.correctionType] || 0) + 1;
    });
    
    const topIssues = Object.entries(issueTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Determine trend (simplified)
    const recentCorrections = manufacturerCorrections.filter(c => 
      c.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    );
    
    const improvementTrend = recentCorrections.length < manufacturerCorrections.length * 0.3 
      ? "improving" 
      : recentCorrections.length > manufacturerCorrections.length * 0.7 
        ? "declining" 
        : "stable";
    
    return {
      totalCorrections: manufacturerCorrections.length,
      totalFeedback: manufacturerFeedback.length,
      averageAccuracy,
      topIssues,
      improvementTrend
    };
  }
}