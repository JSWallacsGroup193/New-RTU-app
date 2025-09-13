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
  familyValidationResponseSchema,
  insertUserSchema,
  insertProjectSchema,
  insertProjectUnitSchema,
  createProjectRequestSchema,
  updateProjectRequestSchema,
  addUnitToProjectRequestSchema,
  projectListResponseSchema,
  projectDetailResponseSchema
} from "@shared/schema";
import { z } from "zod";
import {
  handleError,
  handleValidationError,
  handleNotFoundError,
  handleConflictError,
  handleCapacityError,
  handleInternalError,
  validateRequestBody
} from "./utils/errorHandlers";

// Initialize services
const parser = new HVACModelParser();
const matcher = new DaikinMatcher();

// Request validation schemas
const decodeRequestSchema = z.object({
  modelNumber: z.string().min(3).max(50).trim(),
  efficiencyPreference: z.object({
    minSEER: z.number().optional(),
    preferredLevel: z.enum(["standard", "high", "premium"]).optional(),
    energySavings: z.boolean().optional()
  }).optional()
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
      const { modelNumber, efficiencyPreference } = decodeRequestSchema.parse(req.body);
      
      // Check cache first - include efficiency preferences in cache key for specificity
      const cacheKey = efficiencyPreference ? 
        `${modelNumber}_eff_${JSON.stringify(efficiencyPreference)}` : 
        modelNumber;
      
      let parsedModel = await storage.getCachedModel(modelNumber);
      let replacements = await storage.getCachedReplacements(cacheKey);
      
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
        // Find Daikin replacements with efficiency preferences
        replacements = matcher.findReplacements(parsedModel, efficiencyPreference);
        
        // Cache the replacements with the specific cache key
        await storage.cacheReplacements(cacheKey, replacements);
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
      return handleError(res, error, "processing model decode request", "Invalid request format");
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
        "4.0": 48000, "5.0": 60000, "6.0": 72000, "7.5": 90000, "8.5": 102000,
        "10.0": 120000, "12.5": 150000, "15.0": 180000, "20.0": 240000, "25.0": 300000
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
      return handleError(res, error, "searching specifications", "Invalid search parameters");
    }
  });

  // ============================================================================
  // CATALOG VERIFICATION & STATS ENDPOINTS
  // ============================================================================

  // Daikin catalog statistics and verification endpoint
  app.get("/api/daikin-catalog/stats", async (req, res) => {
    try {
      const { DAIKIN_R32_CATALOG } = await import("./data/daikinCatalog");
      
      // Analyze catalog completeness
      const familyBreakdown = DAIKIN_R32_CATALOG.reduce((acc, unit) => {
        const familyKey = unit.modelNumber.substring(0, 3); // DSC, DHC, DSG, etc.
        if (!acc[familyKey]) {
          acc[familyKey] = { count: 0, tonnages: new Set(), voltages: new Set(), driveTypes: new Set() };
        }
        acc[familyKey].count++;
        acc[familyKey].tonnages.add(unit.tonnage);
        acc[familyKey].voltages.add(unit.voltage);
        acc[familyKey].driveTypes.add(unit.driveType);
        return acc;
      }, {} as Record<string, any>);

      // Convert sets to arrays for JSON response
      Object.keys(familyBreakdown).forEach(family => {
        familyBreakdown[family].tonnages = Array.from(familyBreakdown[family].tonnages).sort();
        familyBreakdown[family].voltages = Array.from(familyBreakdown[family].voltages).sort();
        familyBreakdown[family].driveTypes = Array.from(familyBreakdown[family].driveTypes).sort();
      });

      // Check for schema compliance
      const voltageIssues = DAIKIN_R32_CATALOG.filter(unit => 
        !["208-230", "460", "575"].includes(unit.voltage)
      );
      
      const driveTypeIssues = DAIKIN_R32_CATALOG.filter(unit => 
        !["Fixed Speed", "Variable Speed", "Two-Stage"].includes(unit.driveType)
      );

      const systemTypeIssues = DAIKIN_R32_CATALOG.filter(unit => 
        !["Heat Pump", "Gas/Electric", "Straight A/C"].includes(unit.systemType)
      );

      const response = {
        total_units: DAIKIN_R32_CATALOG.length,
        family_breakdown: familyBreakdown,
        schema_compliance: {
          voltage_issues: {
            count: voltageIssues.length,
            examples: voltageIssues.slice(0, 3).map(u => ({ id: u.id, voltage: u.voltage }))
          },
          drive_type_issues: {
            count: driveTypeIssues.length,
            examples: driveTypeIssues.slice(0, 3).map(u => ({ id: u.id, driveType: u.driveType }))
          },
          system_type_issues: {
            count: systemTypeIssues.length,
            examples: systemTypeIssues.slice(0, 3).map(u => ({ id: u.id, systemType: u.systemType }))
          }
        },
        sample_units: DAIKIN_R32_CATALOG.slice(0, 5).map(unit => ({
          id: unit.id,
          modelNumber: unit.modelNumber,
          systemType: unit.systemType,
          tonnage: unit.tonnage,
          voltage: unit.voltage,
          phases: unit.phases,
          driveType: unit.driveType
        }))
      };

      res.json(response);
    } catch (error) {
      console.error("Catalog stats error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Unable to generate catalog statistics"
      });
    }
  });

  // Verification endpoint to test authentic family ID generation
  app.get("/api/daikin-catalog/verify", async (req, res) => {
    try {
      const { DAIKIN_R32_CATALOG } = await import("./data/daikinCatalog");
      
      // Test that all IDs follow authentic pattern (not synthetic dz_*)
      const authenticIDs = DAIKIN_R32_CATALOG.filter(unit => 
        unit.id.match(/^(dsc|dhc|dsg|dhg|dsh|dhh)_\d+_\d+_\d+ph/)
      );
      
      const syntheticIDs = DAIKIN_R32_CATALOG.filter(unit => 
        unit.id.startsWith('dz_') || !unit.id.match(/^(dsc|dhc|dsg|dhg|dsh|dhh)_/)
      );

      // Test specification search with known valid parameters
      const testSearch = {
        systemType: "Straight A/C" as const,
        tonnage: "5.0" as const,
        voltage: "208-230" as const,
        phases: "3" as const,
        efficiency: "standard" as const
      };

      const searchResults = matcher.searchBySpecInput(testSearch);
      
      // Test voltage filtering works
      const voltageTest = DAIKIN_R32_CATALOG.filter(unit => unit.voltage === "208-230");
      const driveTypeTest = DAIKIN_R32_CATALOG.filter(unit => unit.driveType === "Variable Speed");

      const response = {
        catalog_verification: {
          total_units: DAIKIN_R32_CATALOG.length,
          authentic_ids: {
            count: authenticIDs.length,
            examples: authenticIDs.slice(0, 5).map(u => u.id)
          },
          synthetic_ids: {
            count: syntheticIDs.length,
            examples: syntheticIDs.slice(0, 3).map(u => u.id)
          },
          all_authentic: syntheticIDs.length === 0
        },
        family_presence: {
          dsc_units: DAIKIN_R32_CATALOG.filter(u => u.id.startsWith('dsc_')).length,
          dhc_units: DAIKIN_R32_CATALOG.filter(u => u.id.startsWith('dhc_')).length,
          dsg_units: DAIKIN_R32_CATALOG.filter(u => u.id.startsWith('dsg_')).length,
          dhg_units: DAIKIN_R32_CATALOG.filter(u => u.id.startsWith('dhg_')).length,
          dsh_units: DAIKIN_R32_CATALOG.filter(u => u.id.startsWith('dsh_')).length,
          dhh_units: DAIKIN_R32_CATALOG.filter(u => u.id.startsWith('dhh_')).length
        },
        specification_search: {
          test_input: testSearch,
          results_count: searchResults.length,
          sample_results: searchResults.slice(0, 3).map(unit => ({
            id: unit.id,
            modelNumber: unit.modelNumber,
            tonnage: unit.tonnage,
            voltage: unit.voltage,
            driveType: unit.driveType
          }))
        },
        filtering_verification: {
          voltage_208_230_count: voltageTest.length,
          variable_speed_count: driveTypeTest.length,
          sample_208_230_units: voltageTest.slice(0, 3).map(u => ({ id: u.id, voltage: u.voltage })),
          sample_variable_speed_units: driveTypeTest.slice(0, 3).map(u => ({ id: u.id, driveType: u.driveType }))
        }
      };

      res.json(response);
    } catch (error) {
      console.error("Catalog verification error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Unable to verify catalog integrity"
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

  // ============================================================================
  // PROJECT MANAGEMENT API ENDPOINTS
  // ============================================================================

  // User Management Endpoints
  
  // Create user profile
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({
          error: "User already exists",
          message: "A user with this email address already exists"
        });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid user data",
          details: error.errors
        });
      }
      console.error("Create user error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while creating the user"
      });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "User with the specified ID does not exist"
        });
      }
      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while retrieving the user"
      });
    }
  });

  // Update user profile
  app.put("/api/users/:id", async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "User with the specified ID does not exist"
        });
      }
      
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid user data",
          details: error.errors
        });
      }
      console.error("Update user error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while updating the user"
      });
    }
  });

  // Get user by email (for login/authentication)
  app.get("/api/users/email/:email", async (req, res) => {
    try {
      const user = await storage.getUserByEmail(req.params.email);
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "User with the specified email does not exist"
        });
      }
      res.json(user);
    } catch (error) {
      console.error("Get user by email error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while retrieving the user"
      });
    }
  });

  // Project Management Endpoints

  // Create new project
  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = createProjectRequestSchema.parse(req.body);
      
      // Convert to insertProjectSchema format
      const insertData = {
        name: projectData.name,
        ownerId: req.body.ownerId, // This should come from authentication in real app
        description: projectData.description,
        customerName: projectData.customerName,
        customerLocation: projectData.customerLocation,
        projectDate: projectData.projectDate ? new Date(projectData.projectDate) : undefined,
        status: "draft" as const
      };
      
      const project = await storage.createProject(insertData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid project data",
          details: error.errors
        });
      }
      console.error("Create project error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while creating the project"
      });
    }
  });

  // List projects for user
  app.get("/api/projects", async (req, res) => {
    try {
      const ownerId = req.query.ownerId as string;
      const search = req.query.search as string;
      
      if (!ownerId) {
        return res.status(400).json({
          error: "Missing parameter",
          message: "ownerId query parameter is required"
        });
      }
      
      const projects = search 
        ? await storage.searchProjects(ownerId, search)
        : await storage.listProjectsByOwner(ownerId);
      
      // Enhance with unit counts
      const enhancedProjects = await Promise.all(
        projects.map(async (project) => {
          const unitCount = await storage.getProjectUnitCount(project.id);
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            customerName: project.customerName,
            status: project.status,
            unitCount,
            remainingCapacity: 20 - unitCount,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString()
          };
        })
      );
      
      const response = {
        projects: enhancedProjects,
        totalCount: enhancedProjects.length
      };
      
      const validatedResponse = projectListResponseSchema.parse(response);
      res.json(validatedResponse);
    } catch (error) {
      console.error("List projects error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while retrieving projects"
      });
    }
  });

  // Get project by ID with units
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({
          error: "Project not found",
          message: "Project with the specified ID does not exist"
        });
      }
      
      const units = await storage.getProjectUnits(project.id);
      const unitCount = units.length;
      
      const response = {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          customerName: project.customerName,
          customerLocation: project.customerLocation,
          status: project.status,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString()
        },
        units: units.map(unit => ({
          id: unit.id,
          originalModelNumber: unit.originalModelNumber,
          originalManufacturer: unit.originalManufacturer,
          chosenReplacementModel: unit.chosenReplacementModel,
          configuration: unit.configuration,
          notes: unit.notes,
          status: unit.status,
          createdAt: unit.createdAt.toISOString()
        })),
        unitCount,
        remainingCapacity: 20 - unitCount
      };
      
      const validatedResponse = projectDetailResponseSchema.parse(response);
      res.json(validatedResponse);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while retrieving the project"
      });
    }
  });

  // Update project
  app.put("/api/projects/:id", async (req, res) => {
    try {
      const projectData = updateProjectRequestSchema.parse(req.body);
      
      // Convert to insertProjectSchema format for updates
      const updateData: any = {};
      if (projectData.name) updateData.name = projectData.name;
      if (projectData.description !== undefined) updateData.description = projectData.description;
      if (projectData.customerName !== undefined) updateData.customerName = projectData.customerName;
      if (projectData.customerLocation !== undefined) updateData.customerLocation = projectData.customerLocation;
      if (projectData.projectDate) updateData.projectDate = new Date(projectData.projectDate);
      
      const project = await storage.updateProject(req.params.id, updateData);
      
      if (!project) {
        return res.status(404).json({
          error: "Project not found",
          message: "Project with the specified ID does not exist"
        });
      }
      
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid project data",
          details: error.errors
        });
      }
      console.error("Update project error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while updating the project"
      });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const success = await storage.deleteProject(req.params.id);
      
      if (!success) {
        return res.status(404).json({
          error: "Project not found",
          message: "Project with the specified ID does not exist"
        });
      }
      
      res.json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while deleting the project"
      });
    }
  });

  // Project Unit Management Endpoints

  // Add unit to project
  app.post("/api/projects/:projectId/units", async (req, res) => {
    try {
      // Validate request body
      const validation = validateRequestBody(addUnitToProjectRequestSchema, req.body);
      if (!validation.success) {
        return handleValidationError(res, validation.error, "Invalid unit data");
      }

      // Check project capacity first
      const canAdd = await storage.canAddUnitsToProject(req.params.projectId, 1);
      if (!canAdd) {
        return handleCapacityError(res, 20);
      }
      
      const unitData = {
        projectId: req.params.projectId,
        originalModelNumber: validation.data.originalUnit.modelNumber,
        originalManufacturer: validation.data.originalUnit.manufacturer,
        chosenReplacementId: validation.data.chosenReplacement.id,
        chosenReplacementModel: validation.data.chosenReplacement.modelNumber,
        configuration: validation.data.configuration || {},
        notes: validation.data.notes || "",
        status: "pending" as const
      };
      
      const projectUnit = await storage.addUnitToProject(unitData);
      res.status(201).json(projectUnit);
    } catch (error) {
      return handleError(res, error, "adding unit to project");
    }
  });

  // Remove unit from project
  app.delete("/api/projects/:projectId/units/:unitId", async (req, res) => {
    try {
      const success = await storage.removeUnitFromProject(req.params.unitId);
      
      if (!success) {
        return res.status(404).json({
          error: "Unit not found",
          message: "Unit with the specified ID does not exist"
        });
      }
      
      res.json({ success: true, message: "Unit removed from project successfully" });
    } catch (error) {
      console.error("Remove unit from project error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while removing the unit from the project"
      });
    }
  });

  // Update project unit
  app.put("/api/projects/:projectId/units/:unitId", async (req, res) => {
    try {
      const updateData: any = {};
      if (req.body.configuration !== undefined) updateData.configuration = req.body.configuration;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.status !== undefined) updateData.status = req.body.status;
      
      const unit = await storage.updateProjectUnit(req.params.unitId, updateData);
      
      if (!unit) {
        return res.status(404).json({
          error: "Unit not found",
          message: "Unit with the specified ID does not exist"
        });
      }
      
      res.json(unit);
    } catch (error) {
      console.error("Update project unit error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while updating the unit"
      });
    }
  });

  // Get project capacity information
  app.get("/api/projects/:id/capacity", async (req, res) => {
    try {
      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({
          error: "Project not found",
          message: "Project with the specified ID does not exist"
        });
      }
      
      const currentCount = await storage.getProjectUnitCount(req.params.id);
      const remainingCapacity = await storage.getRemainingProjectCapacity(req.params.id);
      
      res.json({
        projectId: req.params.id,
        currentCount,
        remainingCapacity,
        maxCapacity: 20,
        canAddMore: remainingCapacity > 0
      });
    } catch (error) {
      console.error("Get project capacity error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while retrieving project capacity"
      });
    }
  });

  // Get recent projects for user dashboard
  app.get("/api/users/:userId/recent-projects", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const projects = await storage.getRecentProjects(req.params.userId, limit);
      
      // Enhance with unit counts
      const enhancedProjects = await Promise.all(
        projects.map(async (project) => {
          const unitCount = await storage.getProjectUnitCount(project.id);
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            customerName: project.customerName,
            status: project.status,
            unitCount,
            remainingCapacity: 20 - unitCount,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString()
          };
        })
      );
      
      res.json({
        projects: enhancedProjects,
        totalCount: enhancedProjects.length
      });
    } catch (error) {
      console.error("Get recent projects error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while retrieving recent projects"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
