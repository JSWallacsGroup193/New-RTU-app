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
  submitMatchFeedbackRequestSchema
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
      return handleInternalError(res, "Failed to decode model number");
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
        hasUserCorrections,
        learningConfidence: confidence,
        sessionId: sessionId || 'anonymous'
      });

    } catch (error) {
      console.error("Error in enhanced decode:", error);
      return handleInternalError(res, "Failed to decode model number with learning");
    }
  });

  // Search specifications endpoint
  app.post("/api/specs/search", (req, res) => {
    try {
      const searchCriteria = specSearchInputSchema.parse(req.body);
      
      const matches = matcher.findMatches(searchCriteria);
      
      const response = specSearchResponseSchema.parse({
        matches,
        total: matches.length,
        searchCriteria
      });
      
      res.json(response);
    } catch (error) {
      console.error("Error in specs search:", error);
      if (error instanceof z.ZodError) {
        return handleValidationError(res, error);
      }
      return handleInternalError(res, "Failed to search specifications");
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
      return handleInternalError(res, "Failed to record user correction");
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
      return handleInternalError(res, "Failed to record match feedback");
    }
  });

  // Get learning analytics dashboard data
  app.get("/api/learning/analytics", async (req, res) => {
    try {
      const { startDate, endDate, manufacturer } = req.query;
      
      const timeframe = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        period: "monthly" as const
      };
      
      const analytics = await learningAnalytics.getAnalytics(timeframe);
      
      res.json(analytics);

    } catch (error) {
      console.error("Error fetching learning analytics:", error);
      return handleInternalError(res, "Failed to fetch learning analytics");
    }
  });

  // Get user corrections for analysis
  app.get("/api/learning/corrections", async (req, res) => {
    try {
      const { sessionId, modelNumber, limit = "50" } = req.query;
      
      let corrections;
      if (modelNumber && typeof modelNumber === "string") {
        corrections = await storage.getUserCorrectionsByModelNumber(modelNumber);
      } else {
        corrections = await storage.getUserCorrections(sessionId as string);
      }
      
      const limitNum = parseInt(limit as string);
      const limitedCorrections = corrections.slice(0, limitNum);
      
      res.json({
        corrections: limitedCorrections.map(correction => ({
          id: correction.id,
          originalModelNumber: correction.originalModelNumber,
          correctionType: correction.correctionType,
          createdAt: correction.createdAt.toISOString()
        })),
        total: corrections.length
      });

    } catch (error) {
      console.error("Error fetching user corrections:", error);
      return handleInternalError(res, "Failed to fetch user corrections");
    }
  });

  // Get performance metrics
  app.get("/api/learning/performance", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const timeframe = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        period: "monthly" as const
      };
      
      const metrics = await learningAnalytics.getPerformanceMetrics(timeframe);
      
      res.json(metrics);

    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      return handleInternalError(res, "Failed to fetch performance metrics");
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
      return handleInternalError(res, "Failed to fetch improvement recommendations");
    }
  });

  // Get manufacturer-specific analytics
  app.get("/api/learning/manufacturers/:manufacturer", async (req, res) => {
    try {
      const { manufacturer } = req.params;
      const { startDate, endDate } = req.query;
      
      const timeframe = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        period: "monthly" as const
      };
      
      const analytics = await learningAnalytics.getManufacturerAnalytics(manufacturer, timeframe);
      
      res.json(analytics);

    } catch (error) {
      console.error("Error fetching manufacturer analytics:", error);
      return handleInternalError(res, "Failed to fetch manufacturer analytics");
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
      return handleInternalError(res, "Failed to fetch learning trends");
    }
  });

  // Get parser insights
  app.get("/api/learning/parser-insights", async (req, res) => {
    try {
      const insights = await parser.getLearningInsights();
      
      res.json(insights);

    } catch (error) {
      console.error("Error fetching parser insights:", error);
      return handleInternalError(res, "Failed to fetch parser insights");
    }
  });

  // Export learning data (for backup/analysis)
  app.get("/api/learning/export", async (req, res) => {
    try {
      const { type = "all", format = "json" } = req.query;
      
      const data: any = {};
      
      if (type === "all" || type === "corrections") {
        data.corrections = await storage.getUserCorrections();
      }
      
      if (type === "all" || type === "feedback") {
        data.feedback = await storage.getMatchFeedback();
      }
      
      if (type === "all" || type === "patterns") {
        data.patterns = await storage.getPatternLearnings();
      }
      
      if (type === "all" || type === "metrics") {
        data.metrics = await storage.getLearningMetrics();
      }
      
      // Set appropriate headers for download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="learning-data-${new Date().toISOString()}.json"`);
      
      res.json({
        exportedAt: new Date().toISOString(),
        exportType: type,
        data
      });

    } catch (error) {
      console.error("Error exporting learning data:", error);
      return handleInternalError(res, "Failed to export learning data");
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