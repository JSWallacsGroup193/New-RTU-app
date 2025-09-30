import type { 
  UserCorrection, 
  PatternLearning, 
  MatchFeedback, 
  LearningMetric,
  LearningAnalyticsResponse
} from "@shared/schema";
import type { IStorage } from "../storage";

export interface AnalyticsTimeframe {
  startDate?: Date;
  endDate?: Date;
  period: "daily" | "weekly" | "monthly" | "all_time";
}

export interface ManufacturerAnalytics {
  manufacturer: string;
  totalCorrections: number;
  totalFeedback: number;
  averageAccuracy: number;
  improvementRate: number;
  topIssues: Array<{type: string; count: number; percentage: number}>;
}

export interface LearningTrends {
  parsingAccuracy: "improving" | "stable" | "declining";
  matchQuality: "improving" | "stable" | "declining";
  userSatisfaction: "improving" | "stable" | "declining";
}

/**
 * LearningAnalytics service provides insights and metrics about the learning system
 * performance, including trends, accuracy improvements, and user satisfaction.
 */
export class LearningAnalytics {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Get comprehensive learning analytics for a given timeframe
   */
  async getAnalytics(timeframe: AnalyticsTimeframe): Promise<LearningAnalyticsResponse> {
    const [corrections, feedback, patterns, metrics] = await Promise.all([
      this.getCorrectionsInTimeframe(timeframe),
      this.getFeedbackInTimeframe(timeframe),
      this.storage.getPatternLearnings(),
      this.getMetricsInTimeframe(timeframe)
    ]);

    // Calculate summary metrics
    const summary = await this.calculateSummaryMetrics(
      corrections, 
      feedback, 
      patterns, 
      metrics
    );

    // Calculate detailed metrics
    const detailedMetrics = this.calculateDetailedMetrics(metrics);

    return {
      metrics: detailedMetrics,
      summary
    };
  }

  /**
   * Get analytics for a specific manufacturer
   */
  async getManufacturerAnalytics(
    manufacturer: string, 
    timeframe: AnalyticsTimeframe
  ): Promise<ManufacturerAnalytics> {
    const corrections = await this.getCorrectionsInTimeframe(timeframe);
    const feedback = await this.getFeedbackInTimeframe(timeframe);
    const patterns = await this.storage.getActivePatternsByManufacturer(manufacturer);

    // Filter data for specific manufacturer
    const manufacturerCorrections = corrections.filter(c => 
      this.extractManufacturer(c.originalParsedData) === manufacturer
    );
    
    const manufacturerFeedback = feedback.filter(f => 
      this.extractManufacturer(f.parsedSpecs) === manufacturer
    );

    // Calculate accuracy from patterns
    const totalSuccessful = patterns.reduce((sum, p) => sum + (p.successCount || 0), 0);
    const totalAttempts = patterns.reduce((sum, p) => sum + (p.matchCount || 0), 0);
    const averageAccuracy = totalAttempts > 0 ? totalSuccessful / totalAttempts : 0;

    // Calculate improvement rate
    const improvementRate = await this.calculateImprovementRate(
      manufacturer, 
      timeframe
    );

    // Identify top issues
    const topIssues = this.identifyTopIssues(manufacturerCorrections);

    return {
      manufacturer,
      totalCorrections: manufacturerCorrections.length,
      totalFeedback: manufacturerFeedback.length,
      averageAccuracy,
      improvementRate,
      topIssues
    };
  }

  /**
   * Get learning trends over time
   */
  async getLearningTrends(timeframe: AnalyticsTimeframe): Promise<LearningTrends> {
    const metrics = await this.getMetricsInTimeframe(timeframe);
    
    // Calculate trends for different aspects
    const parsingAccuracy = this.calculateTrend(
      metrics.filter(m => m.metricType === "parsing_accuracy")
    );
    
    const matchQuality = this.calculateTrend(
      metrics.filter(m => m.metricType === "match_quality")
    );
    
    const userSatisfaction = this.calculateTrend(
      metrics.filter(m => m.metricType === "user_satisfaction")
    );

    return {
      parsingAccuracy,
      matchQuality,
      userSatisfaction
    };
  }

  /**
   * Get performance metrics for a specific time period
   */
  async getPerformanceMetrics(timeframe: AnalyticsTimeframe): Promise<{
    totalQueries: number;
    successfulParses: number;
    accuracyRate: number;
    averageConfidence: number;
    topManufacturers: Array<{name: string; queries: number; accuracy: number}>;
    errorPatterns: Array<{type: string; frequency: number; examples: string[]}>;
  }> {
    const corrections = await this.getCorrectionsInTimeframe(timeframe);
    const feedback = await this.getFeedbackInTimeframe(timeframe);
    const patterns = await this.storage.getPatternLearnings();

    // Calculate basic metrics
    const totalQueries = corrections.length + feedback.length;
    const successfulParses = feedback.filter(f => 
      ["perfect_match", "good_match"].includes(f.feedbackType)
    ).length;
    
    const accuracyRate = totalQueries > 0 ? successfulParses / totalQueries : 0;
    
    const averageConfidence = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / patterns.length
      : 0;

    // Analyze manufacturers
    const manufacturerStats = await this.getTopManufacturers(corrections, feedback);
    
    // Identify error patterns
    const errorPatterns = this.identifyErrorPatterns(corrections);

    return {
      totalQueries,
      successfulParses,
      accuracyRate,
      averageConfidence,
      topManufacturers: manufacturerStats,
      errorPatterns
    };
  }

  /**
   * Generate improvement recommendations based on analytics
   */
  async getImprovementRecommendations(): Promise<Array<{
    priority: "high" | "medium" | "low";
    category: string;
    recommendation: string;
    expectedImpact: string;
    implementationEffort: string;
  }>> {
    const corrections = await this.storage.getUserCorrections();
    const feedback = await this.storage.getMatchFeedback();
    const patterns = await this.storage.getPatternLearnings();

    const recommendations = [];

    // Analyze correction frequency by type
    const correctionsByType = this.groupCorrectionsByType(corrections);
    
    // High-frequency correction types get high priority recommendations
    for (const [type, count] of Object.entries(correctionsByType)) {
      if (count > 10) { // Threshold for high-frequency issues
        recommendations.push({
          priority: "high" as const,
          category: "Pattern Learning",
          recommendation: `Improve pattern recognition for ${type} corrections`,
          expectedImpact: `Could reduce ${type} errors by 60-80%`,
          implementationEffort: "Medium"
        });
      }
    }

    // Analyze pattern performance
    const lowPerformingPatterns = patterns.filter(p => (p.successRate || 0) < 0.6);
    if (lowPerformingPatterns.length > 0) {
      recommendations.push({
        priority: "medium" as const,
        category: "Pattern Optimization",
        recommendation: `Review and optimize ${lowPerformingPatterns.length} low-performing patterns`,
        expectedImpact: "Improve overall accuracy by 10-15%",
        implementationEffort: "Low"
      });
    }

    // Analyze user satisfaction
    const lowSatisfactionFeedback = feedback.filter(f => 
      (f.userSatisfactionScore || 0) < 0.5
    );
    
    if (lowSatisfactionFeedback.length > feedback.length * 0.3) {
      recommendations.push({
        priority: "high" as const,
        category: "User Experience",
        recommendation: "Improve match suggestion quality and relevance",
        expectedImpact: "Increase user satisfaction by 25-40%",
        implementationEffort: "High"
      });
    }

    // Check for missing manufacturer coverage
    const uncoveredManufacturers = await this.findUncoveredManufacturers();
    if (uncoveredManufacturers.length > 0) {
      recommendations.push({
        priority: "medium" as const,
        category: "Coverage Expansion",
        recommendation: `Add pattern support for ${uncoveredManufacturers.length} manufacturers`,
        expectedImpact: "Expand system coverage by 15-25%",
        implementationEffort: "Medium"
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Private helper methods

  private async getCorrectionsInTimeframe(timeframe: AnalyticsTimeframe): Promise<UserCorrection[]> {
    const allCorrections = await this.storage.getUserCorrections();
    
    if (!timeframe.startDate && !timeframe.endDate) {
      return allCorrections;
    }
    
    return allCorrections.filter(correction => {
      const date = correction.createdAt;
      if (timeframe.startDate && date < timeframe.startDate) return false;
      if (timeframe.endDate && date > timeframe.endDate) return false;
      return true;
    });
  }

  private async getFeedbackInTimeframe(timeframe: AnalyticsTimeframe): Promise<MatchFeedback[]> {
    const allFeedback = await this.storage.getMatchFeedback();
    
    if (!timeframe.startDate && !timeframe.endDate) {
      return allFeedback;
    }
    
    return allFeedback.filter(feedback => {
      const date = feedback.createdAt;
      if (timeframe.startDate && date < timeframe.startDate) return false;
      if (timeframe.endDate && date > timeframe.endDate) return false;
      return true;
    });
  }

  private async getMetricsInTimeframe(timeframe: AnalyticsTimeframe): Promise<LearningMetric[]> {
    return this.storage.getLearningMetrics(timeframe.startDate, timeframe.endDate);
  }

  private async calculateSummaryMetrics(
    corrections: UserCorrection[],
    feedback: MatchFeedback[],
    patterns: PatternLearning[],
    metrics: LearningMetric[]
  ) {
    const totalCorrections = corrections.length;
    const totalFeedback = feedback.length;
    
    // Calculate average accuracy from patterns
    const accuracySum = patterns.reduce((sum, p) => sum + (p.successRate || 0), 0);
    const averageAccuracy = patterns.length > 0 ? accuracySum / patterns.length : 0;
    
    const activePatternsCount = patterns.filter(p => p.isActive).length;
    
    // Get top manufacturers by correction/feedback volume
    const manufacturerCounts = new Map<string, number>();
    
    [...corrections, ...feedback].forEach(item => {
      const manufacturer = this.extractManufacturer(
        'originalParsedData' in item ? item.originalParsedData : item.parsedSpecs
      );
      manufacturerCounts.set(manufacturer, (manufacturerCounts.get(manufacturer) || 0) + 1);
    });
    
    const topManufacturers = Array.from(manufacturerCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);
    
    // Calculate improvement trends
    const improvementTrends = await this.getLearningTrends({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date(),
      period: "monthly"
    });

    return {
      totalCorrections,
      totalFeedback,
      averageAccuracy,
      activePatternsCount,
      topManufacturers,
      improvementTrends
    };
  }

  private calculateDetailedMetrics(metrics: LearningMetric[]) {
    return metrics.map(metric => ({
      metricType: metric.metricType,
      measurementDate: metric.measurementDate.toISOString(),
      successRate: metric.successRate,
      improvementRate: metric.improvementRate,
      errorRate: metric.errorRate,
      userSatisfactionAvg: metric.userSatisfactionAvg,
      feedbackVolume: metric.feedbackVolume || 0,
      newPatternsLearned: metric.newPatternsLearned || 0,
      patternsImproved: metric.patternsImproved || 0
    }));
  }

  private async calculateImprovementRate(
    manufacturer: string, 
    timeframe: AnalyticsTimeframe
  ): Promise<number> {
    // Get patterns for this manufacturer
    const patterns = await this.storage.getActivePatternsByManufacturer(manufacturer);
    
    if (patterns.length === 0) return 0;
    
    // Calculate improvement based on success rate changes over time
    const avgSuccessRate = patterns.reduce((sum, p) => sum + (p.successRate || 0), 0) / patterns.length;
    const avgConfidence = patterns.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / patterns.length;
    
    // Simple improvement calculation (would be more sophisticated in production)
    return (avgSuccessRate + avgConfidence) / 2;
  }

  private identifyTopIssues(corrections: UserCorrection[]): Array<{type: string; count: number; percentage: number}> {
    const issueTypes = new Map<string, number>();
    
    corrections.forEach(correction => {
      const type = correction.correctionType;
      issueTypes.set(type, (issueTypes.get(type) || 0) + 1);
    });
    
    const total = corrections.length;
    
    return Array.from(issueTypes.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateTrend(metrics: LearningMetric[]): "improving" | "stable" | "declining" {
    if (metrics.length < 2) return "stable";
    
    // Sort by date
    const sorted = metrics.sort((a, b) => a.measurementDate.getTime() - b.measurementDate.getTime());
    
    // Calculate trend based on success rate
    const first = sorted[0].successRate;
    const last = sorted[sorted.length - 1].successRate;
    
    const change = (last - first) / first;
    
    if (change > 0.05) return "improving";
    if (change < -0.05) return "declining";
    return "stable";
  }

  private async getTopManufacturers(
    corrections: UserCorrection[], 
    feedback: MatchFeedback[]
  ): Promise<Array<{name: string; queries: number; accuracy: number}>> {
    const manufacturerStats = new Map<string, {queries: number; successful: number}>();
    
    // Count corrections (negative events)
    corrections.forEach(correction => {
      const manufacturer = this.extractManufacturer(correction.originalParsedData);
      const stats = manufacturerStats.get(manufacturer) || {queries: 0, successful: 0};
      stats.queries += 1;
      manufacturerStats.set(manufacturer, stats);
    });
    
    // Count feedback (includes successful events)
    feedback.forEach(fb => {
      const manufacturer = this.extractManufacturer(fb.parsedSpecs);
      const stats = manufacturerStats.get(manufacturer) || {queries: 0, successful: 0};
      stats.queries += 1;
      if (["perfect_match", "good_match"].includes(fb.feedbackType)) {
        stats.successful += 1;
      }
      manufacturerStats.set(manufacturer, stats);
    });
    
    return Array.from(manufacturerStats.entries())
      .map(([name, stats]) => ({
        name,
        queries: stats.queries,
        accuracy: stats.queries > 0 ? stats.successful / stats.queries : 0
      }))
      .sort((a, b) => b.queries - a.queries)
      .slice(0, 10);
  }

  private identifyErrorPatterns(corrections: UserCorrection[]): Array<{type: string; frequency: number; examples: string[]}> {
    const errorPatterns = new Map<string, string[]>();
    
    corrections.forEach(correction => {
      const type = correction.correctionType;
      const examples = errorPatterns.get(type) || [];
      examples.push(correction.originalModelNumber);
      errorPatterns.set(type, examples);
    });
    
    return Array.from(errorPatterns.entries())
      .map(([type, examples]) => ({
        type,
        frequency: examples.length,
        examples: examples.slice(0, 5) // Show first 5 examples
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  private groupCorrectionsByType(corrections: UserCorrection[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    corrections.forEach(correction => {
      const type = correction.correctionType;
      grouped[type] = (grouped[type] || 0) + 1;
    });
    
    return grouped;
  }

  private async findUncoveredManufacturers(): Promise<string[]> {
    const corrections = await this.storage.getUserCorrections();
    const patterns = await this.storage.getPatternLearnings();
    
    // Get manufacturers from corrections
    const correctionManufacturers = new Set(
      corrections.map(c => this.extractManufacturer(c.originalParsedData))
    );
    
    // Get manufacturers with patterns
    const patternManufacturers = new Set(
      patterns.map(p => p.manufacturer)
    );
    
    // Find manufacturers that have corrections but no patterns
    return Array.from(correctionManufacturers).filter(m => !patternManufacturers.has(m));
  }

  private extractManufacturer(parsedData: any): string {
    return parsedData?.manufacturer || "Unknown";
  }
}