import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { HVACModelParser } from "./services/hvacParser";
import { DaikinMatcher } from "./services/daikinMatcher";
import { 
  decodeResponseSchema, 
  specSearchResponseSchema, 
  specSearchInputSchema,
  positionBasedDecodeResponseSchema,
  positionBasedSpecSearchResponseSchema,
  buildModelRequestSchema,
  buildModelResponseSchema,
  parseModelRequestSchema,
  parseModelResponseSchema,
  advancedMatchingRequestSchema,
  advancedMatchingResponseSchema,
  familyValidationRequestSchema,
  familyValidationResponseSchema
} from "@shared/schema";
import { z } from "zod";

// Initialize services
const parser = new HVACModelParser();
const matcher = new DaikinMatcher();

// Request validation schemas
const decodeRequestSchema = z.object({
  modelNumber: z.string().min(3).max(50).trim()
});

// Enhanced decode request with options
const enhancedDecodeRequestSchema = z.object({
  modelNumber: z.string().min(3).max(50).trim(),
  options: z.object({
    include_position_analysis: z.boolean().default(true),
    include_size_ladders: z.boolean().default(true),
    fallback_strategy: z.object({
      selection_strategy: z.enum(["nearest", "exact"]).default("nearest"),
      tie_breaker: z.enum(["round_half_up_to_higher", "round_half_down_to_lower"]).default("round_half_up_to_higher"),
      bounds_strategy: z.enum(["clip_to_min_max", "error_on_bounds"]).default("clip_to_min_max")
    }).optional()
  }).optional().default({})
});

// Use the enhanced specification search schema from shared schema
const specSearchRequestSchema = specSearchInputSchema;

export async function registerRoutes(app: Express): Promise<Server> {
  // Model decoding endpoint
  app.post("/api/decode", async (req, res) => {
    try {
      // Validate request
      const { modelNumber } = decodeRequestSchema.parse(req.body);
      
      // Check cache first
      let parsedModel = await storage.getCachedModel(modelNumber);
      let replacements = await storage.getCachedReplacements(modelNumber);
      
      if (!parsedModel) {
        // Parse the model number
        parsedModel = parser.parseModelNumber(modelNumber) || undefined;
        
        if (!parsedModel) {
          return res.status(400).json({
            error: "Unable to decode model number",
            message: `Model number "${modelNumber}" could not be parsed. Please check the format and try again.`
          });
        }
        
        // Cache the parsed result
        await storage.cacheParsedModel(modelNumber, parsedModel);
      }
      
      if (!replacements) {
        // Find Daikin replacements
        replacements = matcher.findReplacements(parsedModel);
        
        // Cache the replacements
        await storage.cacheReplacements(modelNumber, replacements);
      }
      
      // Build response
      const response = {
        originalUnit: parsedModel,
        replacements: replacements
      };
      
      // Validate response before sending
      const validatedResponse = decodeResponseSchema.parse(response);
      res.json(validatedResponse);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid request format",
          details: error.errors
        });
      }
      
      console.error("Decode error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while processing your request"
      });
    }
  });

  // Enhanced specification-based search endpoint
  app.post("/api/search-specs", async (req, res) => {
    try {
      // Validate request with enhanced schema
      const searchInput = specSearchRequestSchema.parse(req.body);
      
      // Convert tonnage to BTU range for the search
      const tonnageToBTU = {
        "1.5": 18000, "2.0": 24000, "2.5": 30000, "3.0": 36000, "3.5": 42000,
        "4.0": 48000, "5.0": 60000, "6.0": 72000, "7.5": 90000, "10.0": 120000,
        "12.5": 150000, "15.0": 180000, "17.5": 210000, "20.0": 240000, "25.0": 300000
      };
      
      const targetBTU = tonnageToBTU[searchInput.tonnage as keyof typeof tonnageToBTU];
      if (!targetBTU) {
        return res.status(400).json({
          error: "Invalid tonnage",
          message: "Unsupported tonnage value"
        });
      }
      
      // Create BTU range (±10% for flexibility)
      const btuRange = {
        min: Math.floor(targetBTU * 0.9),
        max: Math.ceil(targetBTU * 1.1)
      };
      
      // Search Daikin units using enhanced specification input
      const daikinUnits = matcher.searchBySpecInput(searchInput);
      
      // Transform DaikinUnitSpec objects to match specSearchResponseSchema
      const transformedResults = daikinUnits.map(unit => ({
        id: unit.id,
        modelNumber: unit.modelNumber,
        systemType: unit.systemType,
        btuCapacity: unit.btuCapacity,
        voltage: unit.voltage,
        phases: unit.phases,
        specifications: [
          { label: "SEER Rating", value: unit.seerRating.toString(), unit: "BTU/Wh" },
          { label: "Sound Level", value: unit.soundLevel.toString(), unit: "dB" },
          { label: "Refrigerant", value: unit.refrigerant },
          { label: "Drive Type", value: unit.driveType },
          { label: "Cooling Stages", value: unit.coolingStages.toString() },
          ...(unit.heatingStages ? [{ label: "Heating Stages", value: unit.heatingStages.toString() }] : []),
          ...(unit.hspfRating ? [{ label: "HSPF Rating", value: unit.hspfRating.toString() }] : []),
          ...(unit.heatingBTU ? [{ label: "Heating BTU", value: unit.heatingBTU.toString(), unit: "BTU/hr" }] : []),
          ...(unit.heatKitKW ? [{ label: "Heat Kit", value: unit.heatKitKW.toString(), unit: "kW" }] : []),
          { label: "Warranty", value: unit.warranty.toString(), unit: "years" },
          { label: "Weight", value: unit.weight.toString(), unit: "lbs" },
          { label: "Dimensions", value: `${unit.dimensions.length}"L x ${unit.dimensions.width}"W x ${unit.dimensions.height}"H` }
        ]
      }));
      
      const response = {
        results: transformedResults,
        count: transformedResults.length
      };
      
      // Validate response before sending
      const validatedResponse = specSearchResponseSchema.parse(response);
      res.json(validatedResponse);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error", 
          message: "Invalid search parameters",
          details: error.errors
        });
      }
      
      console.error("Enhanced spec search error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while searching specifications"
      });
    }
  });

  // ============================================================================
  // ENHANCED API ENDPOINTS
  // ============================================================================

  // Enhanced model decoding with position-based analysis
  app.post("/api/decode/enhanced", async (req, res) => {
    try {
      const parsed = enhancedDecodeRequestSchema.parse(req.body);
      const { modelNumber, options = { include_position_analysis: true, include_size_ladders: true } } = parsed;
      
      // Parse the model number with enhanced analysis
      let parsedModel = await storage.getCachedModel(modelNumber);
      
      if (!parsedModel) {
        parsedModel = parser.parseModelNumber(modelNumber) || undefined;
        
        if (!parsedModel) {
          return res.status(400).json({
            error: "Unable to decode model number",
            message: `Model number "${modelNumber}" could not be parsed using enhanced analysis.`
          });
        }
        
        await storage.cacheParsedModel(modelNumber, parsedModel);
      }
      
      // Get enhanced replacements using advanced matching
      const enhancedResults = matcher.findEnhancedReplacements(parsedModel);
      
      // Position analysis if requested
      let positionAnalysis = {};
      if (options.include_position_analysis) {
        const parseRequest = { model_number: modelNumber, validate: true };
        const parseResponse = matcher.parseModelToPositions(parseRequest);
        positionAnalysis = {
          parsed_positions: parseResponse.positions,
          detected_family: parseResponse.family,
          capacity_ladder: enhancedResults[0]?.capacity_match,
          gas_btu_ladder: enhancedResults[0]?.gas_btu_match,
          electric_kw_ladder: enhancedResults[0]?.electric_kw_match
        };
      }
      
      // Build comprehensive response
      const response = {
        originalUnit: parsedModel,
        enhanced_results: enhancedResults,
        position_analysis: positionAnalysis,
        legacy_compatibility: {
          legacy_replacements: matcher.findReplacements(parsedModel),
          enhanced_replacements: enhancedResults.map(result => ({
            id: result.model,
            modelNumber: result.model,
            brand: "Daikin" as const,
            systemType: result.specifications.systemType,
            tonnage: result.specifications.tonnage,
            btuCapacity: result.specifications.btuCapacity,
            voltage: result.specifications.voltage,
            phases: result.specifications.phases,
            seerRating: result.specifications.seerRating,
            refrigerant: result.specifications.refrigerant,
            driveType: result.specifications.driveType,
            coolingStages: result.specifications.coolingStages,
            soundLevel: result.specifications.soundLevel,
            dimensions: result.specifications.dimensions,
            weight: result.specifications.weight,
            sizeMatch: result.capacity_match.direct_match.value < parsedModel.btuCapacity / 12000 ? "smaller" : 
                       result.capacity_match.direct_match.value > parsedModel.btuCapacity / 12000 ? "larger" : "direct",
            sizingRatio: (result.capacity_match.direct_match.value * 12000) / parsedModel.btuCapacity,
            electricalAddOns: [],
            fieldAccessories: [],
            computedModelString: result.model,
            alternativeModels: [],
            specifications: result.specifications.controls.map(control => ({
              label: "Controls",
              value: control
            }))
          }))
        },
        matching_metadata: {
          total_processing_time_ms: Date.now() - Date.now(),
          fallback_strategies_used: options?.fallback_strategy ? ["mathematical_fallback"] : [],
          families_evaluated: Array.from(new Set(enhancedResults.map(r => r.family))),
          match_confidence_score: enhancedResults.length > 0 ? enhancedResults[0].match_quality.overall_score : 0
        }
      };
      
      const validatedResponse = positionBasedDecodeResponseSchema.parse(response);
      res.json(validatedResponse);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid enhanced decode request format",
          details: error.errors
        });
      }
      
      console.error("Enhanced decode error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during enhanced model decoding"
      });
    }
  });

  // Advanced matching endpoint
  app.post("/api/matching/advanced", async (req, res) => {
    try {
      const matchingRequest = advancedMatchingRequestSchema.parse(req.body);
      const response = matcher.advancedMatching(matchingRequest);
      const validatedResponse = advancedMatchingResponseSchema.parse(response);
      res.json(validatedResponse);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid advanced matching request",
          details: error.errors
        });
      }
      
      console.error("Advanced matching error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during advanced matching"
      });
    }
  });

  // Model building endpoint
  app.post("/api/build-model", async (req, res) => {
    try {
      const buildRequest = buildModelRequestSchema.parse(req.body);
      const response = matcher.buildModelWithFallback(buildRequest);
      const validatedResponse = buildModelResponseSchema.parse(response);
      res.json(validatedResponse);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid model build request",
          details: error.errors
        });
      }
      
      console.error("Model build error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during model building"
      });
    }
  });

  // Model parsing endpoint
  app.post("/api/parse-model", async (req, res) => {
    try {
      const parseRequest = parseModelRequestSchema.parse(req.body);
      const response = matcher.parseModelToPositions(parseRequest);
      const validatedResponse = parseModelResponseSchema.parse(response);
      res.json(validatedResponse);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid model parse request",
          details: error.errors
        });
      }
      
      console.error("Model parse error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during model parsing"
      });
    }
  });

  // Family validation endpoint
  app.post("/api/validate-family", async (req, res) => {
    try {
      const validationRequest = familyValidationRequestSchema.parse(req.body);
      const response = matcher.validateFamily(validationRequest);
      const validatedResponse = familyValidationResponseSchema.parse(response);
      res.json(validatedResponse);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid family validation request",
          details: error.errors
        });
      }
      
      console.error("Family validation error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during family validation"
      });
    }
  });

  // Enhanced specification search with position-based filtering
  app.post("/api/search-specs/enhanced", async (req, res) => {
    try {
      const searchInput = specSearchRequestSchema.parse(req.body);
      
      // Convert to advanced matching request
      const matchingRequest = {
        original_capacity: parseFloat(searchInput.tonnage) * 12000,
        original_gas_btu: searchInput.heatingBTU,
        preferred_families: undefined, // Let it search all families
        voltage_preference: [searchInput.voltage],
        efficiency_preference: searchInput.efficiency,
        include_size_ladders: true,
        max_results: 50
      };
      
      const matchingResponse = matcher.advancedMatching(matchingRequest);
      
      const response = {
        results: matchingResponse.matches,
        count: matchingResponse.matches.length,
        search_metadata: {
          families_searched: matchingResponse.matching_summary.families_searched,
          capacity_ladders_used: matchingResponse.size_analysis?.capacity_ladders_generated || 0,
          fallback_applied: matchingResponse.matching_summary.fallback_matches > 0,
          exact_matches: matchingResponse.matching_summary.exact_matches,
          near_matches: matchingResponse.matching_summary.fallback_matches
        },
        available_refinements: {
          families: matcher.getAvailableFamilies(),
          capacity_ranges: [],
          voltage_options: ["208-230", "460", "575"],
          efficiency_tiers: ["standard", "high"]
        }
      };
      
      const validatedResponse = positionBasedSpecSearchResponseSchema.parse(response);
      res.json(validatedResponse);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid enhanced specification search request",
          details: error.errors
        });
      }
      
      console.error("Enhanced spec search error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during enhanced specification search"
      });
    }
  });

  // ============================================================================
  // UTILITY AND METADATA ENDPOINTS
  // ============================================================================

  // Get position mappings
  app.get("/api/position-mappings", (req, res) => {
    res.json(matcher.getPositionMappings());
  });

  // Get family definitions
  app.get("/api/family-definitions", (req, res) => {
    res.json(matcher.getFamilyDefinitions());
  });

  // Get available families
  app.get("/api/families", (req, res) => {
    const minTons = req.query.minTons ? parseFloat(req.query.minTons as string) : undefined;
    const maxTons = req.query.maxTons ? parseFloat(req.query.maxTons as string) : undefined;
    
    res.json({
      families: matcher.getAvailableFamilies(minTons, maxTons),
      total: Object.keys(matcher.getFamilyDefinitions()).length
    });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        parser: "ready",
        matcher: "ready",
        storage: "ready",
        enhanced_features: "enabled"
      },
      capabilities: {
        position_based_building: true,
        mathematical_fallback: true,
        size_ladders: true,
        family_validation: true,
        advanced_matching: true
      }
    });
  });

  // Get supported manufacturers
  app.get("/api/manufacturers", (req, res) => {
    res.json({
      manufacturers: [
        "Carrier", "Trane", "York", "Lennox", "Goodman", "Rheem"
      ],
      outputBrand: "Daikin"
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
