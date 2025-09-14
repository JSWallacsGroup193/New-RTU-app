import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { HVACModelParser } from "./services/hvacParser";
import { DaikinMatcher } from "./services/daikinMatcher";
import { LearningService } from "./services/learningService";
import { LearningAnalytics } from "./services/learningAnalytics";
import { 
  decodeResponseSchema, 
  specSearchResponseSchema, 
  specSearchInputSchema,
  submitCorrectionRequestSchema,
  submitMatchFeedbackRequestSchema,
  parseCombinedVoltage,
  SpecSearchInputLegacy
} from "@shared/schema";
import { ALL_MODEL_SPECIFICATIONS } from "./data/daikinCatalog";
import { z } from "zod";
import { 
  handleValidationError,
  handleInternalError,
  validateRequestBody
} from "./utils/errorHandlers";

// Initialize services
const parser = new HVACModelParser({ enableLearning: true, storage });
const matcher = new DaikinMatcher();
const learningService = new LearningService(storage);
const learningAnalytics = new LearningAnalytics(storage);

// Request validation schemas
const decodeRequestSchema = z.object({
  modelNumber: z.string().min(3).max(50).trim(),
});

export function registerRoutes(app: Express): Server {
  // API Routes
  
  // Decode model number endpoint
  app.post("/api/decode", (req, res) => {
    try {
      const { modelNumber } = decodeRequestSchema.parse(req.body);
      
      const parsedModel = parser.parseModelNumberSync(modelNumber);
      
      if (!parsedModel) {
        return res.status(400).json({
          error: "Unable to decode model number",
          message: `Model number "${modelNumber}" could not be parsed. Please check the format and try again.`
        });
      }
      
      res.json(parsedModel);
    } catch (error) {
      console.error("Error in decode:", error);
      if (error instanceof z.ZodError) {
        return handleValidationError(res, error);
      }
      return handleInternalError(res, "Failed to decode model number", error);
    }
  });

  // Enhanced decode endpoint with learning
  app.post("/api/decode/enhanced", async (req, res) => {
    try {
      const { modelNumber, sessionId } = decodeRequestSchema.extend({
        sessionId: z.string().optional()
      }).parse(req.body);
      
      // Use enhanced parser with learning
      const enhancedParser = new HVACModelParser({ 
        enableLearning: true, 
        storage,
        sessionId: sessionId || 'anonymous'
      });
      
      const parsedModel = await enhancedParser.parseModelNumber(modelNumber);
      
      if (!parsedModel) {
        return res.status(400).json({
          error: "Unable to decode model number",
          message: `Model number "${modelNumber}" could not be parsed. Please check the format and try again.`
        });
      }
      
      // Check for user corrections
      const hasCorrections = await enhancedParser.hasUserCorrections(modelNumber);
      
      // Get parsing confidence
      const confidence = await enhancedParser.getParsingConfidence(modelNumber);
      
      res.json({
        ...parsedModel,
        enhanced: true,
        hasUserCorrections: hasCorrections,
        learningConfidence: confidence,
        sessionId: sessionId || 'anonymous'
      });

    } catch (error) {
      console.error("Error in enhanced decode:", error);
      return handleInternalError(res, "Failed to decode model number with learning", error);
    }
  });

  // Search specifications endpoint
  app.post("/api/specs/search", (req, res) => {
    try {
      const searchCriteria = specSearchInputSchema.parse(req.body);
      
      // Parse the combined voltage format back to separate voltage and phases
      const { voltage, phases } = parseCombinedVoltage(searchCriteria.voltage);
      
      // Create search criteria with separated voltage and phases for the matcher
      const searchCriteriaWithSeparatedVoltage: SpecSearchInputLegacy = {
        ...searchCriteria,
        voltage,
        phases
      };
      
      const matches = matcher.searchBySpecInput(searchCriteriaWithSeparatedVoltage);
      
      const response = specSearchResponseSchema.parse({
        results: matches.map(unit => ({
          id: unit.id || unit.modelNumber,
          modelNumber: unit.modelNumber,
          systemType: unit.systemType,
          btuCapacity: unit.btuCapacity,
          voltage: unit.voltage,
          phases: unit.phases,
          specifications: [
            { label: "SEER2 Rating", value: unit.seerRating?.toString() || "N/A" },
            { label: "Refrigerant", value: unit.refrigerant || "R-32" },
            { label: "Sound Level", value: unit.soundLevel ? `${unit.soundLevel} dB` : "N/A" },
            { label: "Dimensions", value: unit.dimensions ? `${unit.dimensions.length}" x ${unit.dimensions.width}" x ${unit.dimensions.height}"` : "N/A" },
            { label: "Weight", value: unit.weight ? `${unit.weight} lbs` : "N/A" }
          ]
        })),
        count: matches.length
      });
      
      res.json(response);
    } catch (error) {
      console.error("Error in specs search:", error);
      if (error instanceof z.ZodError) {
        return handleValidationError(res, error);
      }
      return handleInternalError(res, "Failed to search specifications", error);
    }
  });

  // Temporary debug endpoint to check catalog status
  app.get("/api/debug/catalog-info", (req, res) => {
    try {
      const catalog = matcher.getDebugCatalogInfo();
      res.json(catalog);
    } catch (error) {
      console.error("Error getting catalog info:", error);
      res.status(500).json({ error: "Failed to get catalog info" });
    }
  });

  // Get specification by model number
  app.get('/api/specs/:modelNumber', (req, res) => {
    try {
      const { modelNumber } = req.params;
      
      if (!modelNumber) {
        return res.status(400).json({ error: 'Model number is required' });
      }
      
      const specification = ALL_MODEL_SPECIFICATIONS[modelNumber.toUpperCase()];
      
      if (!specification) {
        return res.status(404).json({ error: 'Specification not found for this model' });
      }
      
      res.json(specification);
    } catch (error) {
      console.error('Error fetching specification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get all available model specifications
  app.get('/api/specifications', (req, res) => {
    try {
      res.json(ALL_MODEL_SPECIFICATIONS);
    } catch (error) {
      console.error('Error fetching specifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ============================================================================
  // LEARNING SYSTEM API ENDPOINTS
  // ============================================================================

  // Submit user correction for learning
  app.post("/api/learning/corrections", async (req, res) => {
    try {
      const correctionData = submitCorrectionRequestSchema.parse(req.body);
      
      // Store the user correction
      const correction = await storage.createUserCorrection({
        userId: undefined, // Anonymous for now
        sessionId: correctionData.sessionId,
        originalModelNumber: correctionData.originalModelNumber,
        originalParsedData: correctionData.originalParsedData,
        correctedParsedData: correctionData.correctedParsedData,
        correctionType: correctionData.correctionType,
        correctionReason: correctionData.correctionReason,
        confidence: 0.9 // High confidence for user corrections
      });

      // Process the correction with learning service
      const learningResult = await learningService.processUserCorrection(correction);

      res.json({
        success: true,
        correctionId: correction.id,
        message: "Correction recorded successfully. Thank you for helping improve the system!",
        learningStatus: learningResult.newPatternCreated ? "pattern_created" : 
                       learningResult.patternUpdated ? "pattern_updated" : "pending_pattern_update",
        learningResult: {
          newPatternCreated: learningResult.newPatternCreated,
          patternUpdated: learningResult.patternUpdated,
          confidence: learningResult.confidence
        }
      });

    } catch (error) {
      console.error("Error recording user correction:", error);
      return handleInternalError(res, "Failed to record user correction", error);
    }
  });

  // Submit match feedback for learning
  app.post("/api/learning/feedback", async (req, res) => {
    try {
      const feedbackData = submitMatchFeedbackRequestSchema.parse(req.body);
      
      // Calculate quality metrics
      const userSatisfactionScore = mapFeedbackTypeToSatisfaction(feedbackData.feedbackType);

      // Store the match feedback
      const feedback = await storage.createMatchFeedback({
        userId: undefined, // Anonymous for now
        sessionId: feedbackData.sessionId,
        originalModelNumber: feedbackData.originalModelNumber,
        parsedSpecs: feedbackData.parsedSpecs,
        suggestedMatches: feedbackData.suggestedMatches,
        chosenMatchId: feedbackData.chosenMatchId,
        alternativeMatches: [],
        feedbackType: feedbackData.feedbackType,
        feedbackRating: feedbackData.feedbackRating,
        feedbackComments: feedbackData.feedbackComments,
        capacityMatchQuality: null,
        specificationMatchQuality: null,
        userSatisfactionScore
      });

      // Process the feedback with learning service
      const learningResult = await learningService.processMatchFeedback(feedback);

      res.json({
        success: true,
        feedbackId: feedback.id,
        message: "Feedback recorded successfully. This helps improve our matching accuracy!",
        learningStatus: learningResult.matcherImproved ? "matcher_improved" : "pending_matcher_update",
        learningResult: {
          matcherImproved: learningResult.matcherImproved,
          satisfactionScore: learningResult.satisfactionScore
        }
      });

    } catch (error) {
      console.error("Error recording match feedback:", error);
      return handleInternalError(res, "Failed to record match feedback", error);
    }
  });

  // Get learning analytics dashboard data
  app.get("/api/learning/analytics", async (req, res) => {
    try {
      // Validate and sanitize query parameters
      const analyticsRequestSchema = z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        manufacturer: z.string().min(1).max(50).optional(),
        period: z.enum(["daily", "weekly", "monthly", "all_time"]).default("monthly")
      });

      const validatedQuery = analyticsRequestSchema.parse(req.query);
      
      const timeframe = {
        startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
        endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined,
        period: validatedQuery.period
      };

      // Validate date range
      if (timeframe.startDate && timeframe.endDate && timeframe.startDate > timeframe.endDate) {
        return res.status(400).json({
          error: "Invalid date range",
          message: "Start date must be before end date"
        });
      }

      // Limit date range to prevent excessive queries
      const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year
      if (timeframe.startDate && timeframe.endDate) {
        const rangeMs = timeframe.endDate.getTime() - timeframe.startDate.getTime();
        if (rangeMs > maxRangeMs) {
          return res.status(400).json({
            error: "Date range too large",
            message: "Date range cannot exceed 1 year"
          });
        }
      }
      
      const analytics = await learningAnalytics.getAnalytics(timeframe);
      
      res.json(analytics);

    } catch (error) {
      console.error("Error fetching learning analytics:", error);
      if (error instanceof z.ZodError) {
        return handleValidationError(res, error);
      }
      return handleInternalError(res, "Failed to fetch learning analytics", error);
    }
  });

  // Get user corrections for analysis
  app.get("/api/learning/corrections", async (req, res) => {
    try {
      // Validate and sanitize query parameters
      const correctionsQuerySchema = z.object({
        sessionId: z.string().min(1).max(100).optional(),
        modelNumber: z.string().min(1).max(50).optional(),
        limit: z.string().regex(/^\d+$/).default("50").transform(val => Math.min(parseInt(val), 200)), // Max 200 results
        offset: z.string().regex(/^\d+$/).default("0").transform(val => parseInt(val))
      });

      const validatedQuery = correctionsQuerySchema.parse(req.query);
      
      // Ensure at least one search parameter is provided
      if (!validatedQuery.sessionId && !validatedQuery.modelNumber) {
        return res.status(400).json({
          error: "Missing search parameter",
          message: "Either sessionId or modelNumber must be provided"
        });
      }

      let corrections;
      if (validatedQuery.modelNumber) {
        corrections = await storage.getUserCorrectionsByModelNumber(validatedQuery.modelNumber);
      } else {
        corrections = await storage.getUserCorrections(validatedQuery.sessionId);
      }
      
      // Apply pagination
      const startIndex = validatedQuery.offset;
      const endIndex = startIndex + validatedQuery.limit;
      const limitedCorrections = corrections.slice(startIndex, endIndex);
      
      res.json({
        corrections: limitedCorrections.map(correction => ({
          id: correction.id,
          originalModelNumber: correction.originalModelNumber,
          correctionType: correction.correctionType,
          createdAt: correction.createdAt.toISOString(),
          confidence: correction.confidence
        })),
        total: corrections.length,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: endIndex < corrections.length
      });

    } catch (error) {
      console.error("Error fetching user corrections:", error);
      if (error instanceof z.ZodError) {
        return handleValidationError(res, error);
      }
      return handleInternalError(res, "Failed to fetch user corrections", error);
    }
  });

  // Get performance metrics
  app.get("/api/learning/performance", async (req, res) => {
    try {
      // Validate and sanitize query parameters
      const performanceQuerySchema = z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        period: z.enum(["daily", "weekly", "monthly", "all_time"]).default("monthly"),
        manufacturer: z.string().min(1).max(50).optional()
      });

      const validatedQuery = performanceQuerySchema.parse(req.query);
      
      const timeframe = {
        startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
        endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined,
        period: validatedQuery.period
      };

      // Validate date range
      if (timeframe.startDate && timeframe.endDate && timeframe.startDate > timeframe.endDate) {
        return res.status(400).json({
          error: "Invalid date range",
          message: "Start date must be before end date"
        });
      }

      // Limit date range to prevent excessive queries
      const maxRangeMs = 180 * 24 * 60 * 60 * 1000; // 6 months for performance metrics
      if (timeframe.startDate && timeframe.endDate) {
        const rangeMs = timeframe.endDate.getTime() - timeframe.startDate.getTime();
        if (rangeMs > maxRangeMs) {
          return res.status(400).json({
            error: "Date range too large",
            message: "Date range cannot exceed 6 months for performance metrics"
          });
        }
      }
      
      const metrics = await learningAnalytics.getPerformanceMetrics(timeframe);
      
      res.json(metrics);

    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      if (error instanceof z.ZodError) {
        return handleValidationError(res, error);
      }
      return handleInternalError(res, "Failed to fetch performance metrics", error);
    }
  });

  // Get improvement recommendations
  app.get("/api/learning/recommendations", async (req, res) => {
    try {
      const recommendations = await learningAnalytics.getImprovementRecommendations();
      
      res.json({
        recommendations,
        total: recommendations.length
      });

    } catch (error) {
      console.error("Error fetching improvement recommendations:", error);
      return handleInternalError(res, "Failed to fetch improvement recommendations", error);
    }
  });

  // Get manufacturer-specific analytics
  app.get("/api/learning/manufacturers/:manufacturer", async (req, res) => {
    try {
      // Validate manufacturer parameter
      const manufacturerParamSchema = z.object({
        manufacturer: z.string().min(1).max(50).regex(/^[A-Za-z0-9\s\-_]+$/, "Invalid manufacturer name format")
      });

      const manufacturerQuerySchema = z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        period: z.enum(["daily", "weekly", "monthly", "all_time"]).default("monthly")
      });

      const { manufacturer } = manufacturerParamSchema.parse(req.params);
      const validatedQuery = manufacturerQuerySchema.parse(req.query);
      
      const timeframe = {
        startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
        endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined,
        period: validatedQuery.period
      };

      // Validate date range
      if (timeframe.startDate && timeframe.endDate && timeframe.startDate > timeframe.endDate) {
        return res.status(400).json({
          error: "Invalid date range",
          message: "Start date must be before end date"
        });
      }
      
      const analytics = await learningAnalytics.getManufacturerAnalytics(manufacturer, timeframe);
      
      res.json(analytics);

    } catch (error) {
      console.error("Error fetching manufacturer analytics:", error);
      if (error instanceof z.ZodError) {
        return handleValidationError(res, error);
      }
      return handleInternalError(res, "Failed to fetch manufacturer analytics", error);
    }
  });

  // Get learning trends
  app.get("/api/learning/trends", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const timeframe = {
        startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Default to last 90 days
        endDate: endDate ? new Date(endDate as string) : new Date(),
        period: "monthly" as const
      };
      
      const trends = await learningAnalytics.getLearningTrends(timeframe);
      
      res.json(trends);

    } catch (error) {
      console.error("Error fetching learning trends:", error);
      return handleInternalError(res, "Failed to fetch learning trends", error);
    }
  });

  // Get parser insights
  app.get("/api/learning/parser-insights", async (req, res) => {
    try {
      const insights = await parser.getLearningInsights();
      
      res.json(insights);

    } catch (error) {
      console.error("Error fetching parser insights:", error);
      return handleInternalError(res, "Failed to fetch parser insights", error);
    }
  });

  // Export learning data (for backup/analysis)
  app.get("/api/learning/export", async (req, res) => {
    try {
      // Validate and sanitize export parameters
      const exportQuerySchema = z.object({
        type: z.enum(["all", "corrections", "feedback", "patterns", "metrics"]).default("all"),
        format: z.enum(["json"]).default("json"), // Only JSON supported for now
        limit: z.string().regex(/^\d+$/).optional().transform(val => val ? Math.min(parseInt(val), 10000) : undefined), // Max 10k records
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional()
      });

      const validatedQuery = exportQuerySchema.parse(req.query);
      
      // WARNING: This endpoint exports sensitive data and should have proper authentication in production
      console.warn('Learning data export requested', {
        type: validatedQuery.type,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      
      const data: any = {};
      
      if (validatedQuery.type === "all" || validatedQuery.type === "corrections") {
        const corrections = await storage.getUserCorrections();
        data.corrections = validatedQuery.limit ? corrections.slice(0, validatedQuery.limit) : corrections;
      }
      
      if (validatedQuery.type === "all" || validatedQuery.type === "feedback") {
        const feedback = await storage.getMatchFeedback();
        data.feedback = validatedQuery.limit ? feedback.slice(0, validatedQuery.limit) : feedback;
      }
      
      if (validatedQuery.type === "all" || validatedQuery.type === "patterns") {
        const patterns = await storage.getPatternLearnings();
        data.patterns = validatedQuery.limit ? patterns.slice(0, validatedQuery.limit) : patterns;
      }
      
      if (validatedQuery.type === "all" || validatedQuery.type === "metrics") {
        const startDate = validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined;
        const endDate = validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined;
        const metrics = await storage.getLearningMetrics(startDate, endDate);
        data.metrics = validatedQuery.limit ? metrics.slice(0, validatedQuery.limit) : metrics;
      }
      
      // Set appropriate headers for download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="learning-data-${validatedQuery.type}-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json({
        exportedAt: new Date().toISOString(),
        exportType: validatedQuery.type,
        totalRecords: Object.values(data).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
        data
      });

    } catch (error) {
      console.error("Error exporting learning data:", error);
      if (error instanceof z.ZodError) {
        return handleValidationError(res, error);
      }
      return handleInternalError(res, "Failed to export learning data", error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

// Helper function for learning system
function mapFeedbackTypeToSatisfaction(feedbackType: string): number {
  const mapping: Record<string, number> = {
    'perfect_match': 1.0,
    'good_match': 0.8,
    'poor_match': 0.4,
    'wrong_match': 0.1,
    'user_rejected': 0.0
  };
  
  return mapping[feedbackType] || 0.5;
}