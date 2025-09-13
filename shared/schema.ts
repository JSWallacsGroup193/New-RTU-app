import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// ENHANCED ENUMS
// ============================================================================

// System Types
export const systemTypeEnum = z.enum(["Heat Pump", "Gas/Electric", "Straight A/C"]);
export type SystemType = z.infer<typeof systemTypeEnum>;

// Efficiency Levels
export const efficiencyEnum = z.enum(["standard", "high"]);
export type Efficiency = z.infer<typeof efficiencyEnum>;

// Voltage Options
export const voltageEnum = z.enum(["208-230", "460", "575"]);
export type VoltageEnum = z.infer<typeof voltageEnum>;

// Phase Options
export const phaseEnum = z.enum(["1", "3"]);
export type PhaseEnum = z.infer<typeof phaseEnum>;

// Gas Categories for Gas/Electric Systems
export const gasCategoryEnum = z.enum(["Natural Gas", "Propane"]);
export type GasCategory = z.infer<typeof gasCategoryEnum>;

// Size/Tonnage Options
export const tonnageEnum = z.enum([
  "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "5.0", 
  "6.0", "7.5", "8.5", "10.0", "12.5", "15.0", "20.0", "25.0"
]);
export type Tonnage = z.infer<typeof tonnageEnum>;

// Drive Types
export const driveTypeEnum = z.enum(["Fixed Speed", "Variable Speed", "Two-Stage"]);
export type DriveType = z.infer<typeof driveTypeEnum>;

// Refrigerant Types
export const refrigerantEnum = z.enum(["R-410A", "R-32", "R-454B"]);
export type RefrigerantType = z.infer<typeof refrigerantEnum>;

// ============================================================================
// CONDITIONAL SEARCH INPUT SCHEMA
// ============================================================================

// Specification Search Input with ordered fields
export const specSearchInputSchema = z.object({
  // Required fields in order: System Type → Tonnage → Voltage → Phases
  systemType: systemTypeEnum,
  tonnage: tonnageEnum,
  voltage: voltageEnum,
  phases: phaseEnum,
  
  // Conditional fields based on system type
  heatingBTU: z.number().optional(), // Required for Gas/Electric systems
  heatKitKW: z.number().optional(), // Optional for Heat Pumps
  gasCategory: gasCategoryEnum.optional(), // Only for Gas/Electric systems
  
  // Efficiency selection
  efficiency: efficiencyEnum.default("standard"),
  
  // Optional performance requirements
  minSEER: z.number().optional(),
  maxSoundLevel: z.number().optional(),
  
  // Optional filters
  refrigerant: refrigerantEnum.optional(),
  driveType: driveTypeEnum.optional()
}).superRefine((data, ctx) => {
  // Conditional validation for Gas/Electric systems
  if (data.systemType === "Gas/Electric") {
    if (!data.heatingBTU) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "HeatingBTU is required for Gas/Electric systems",
        path: ["heatingBTU"]
      });
    }
    if (!data.gasCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gas category is required for Gas/Electric systems",
        path: ["gasCategory"]
      });
    }
  }
});

export type SpecSearchInput = z.infer<typeof specSearchInputSchema>;

// Helper schema for BTU to tonnage conversion
export const btuToTonnageSchema = z.object({
  btuCapacity: z.number(),
  rounded: z.boolean().default(true) // Whether to round to nearest standard tonnage
});

export type BTUToTonnage = z.infer<typeof btuToTonnageSchema>;

// HVAC Unit schemas
export const hvacUnits = pgTable("hvac_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  manufacturer: text("manufacturer").notNull(),
  modelNumber: text("model_number").notNull(),
  systemType: text("system_type").notNull(), // Heat Pump, Gas/Electric, Straight A/C
  btuCapacity: integer("btu_capacity").notNull(),
  voltage: text("voltage").notNull(),
  phases: text("phases").notNull(),
  seerRating: real("seer_rating"),
  refrigerant: text("refrigerant"),
  soundLevel: integer("sound_level"), // dB
  dimensions: text("dimensions"), // LxWxH in inches
  weight: integer("weight"), // lbs
  warranty: integer("warranty"), // years
  isDaikin: boolean("is_daikin").notNull().default(false),
});

export const insertHvacUnitSchema = createInsertSchema(hvacUnits).omit({
  id: true,
});

export type InsertHvacUnit = z.infer<typeof insertHvacUnitSchema>;
export type HvacUnit = typeof hvacUnits.$inferSelect;

// Parsed model information
// ============================================================================
// COMPREHENSIVE DAIKIN PRODUCT SPECIFICATIONS
// ============================================================================

// Factory-Installed Options
export const factoryInstalledOptionSchema = z.object({
  category: z.string(), // "Electrical", "Controls", "Refrigerant", etc.
  code: z.string(),
  description: z.string(),
  priceAdder: z.number().optional() // Optional price impact
});

// Field Accessories
export const fieldAccessorySchema = z.object({
  category: z.string(), // "Filters", "Controls", "Sensors", etc.
  code: z.string(),
  description: z.string(),
  compatible: z.array(z.string()).optional() // Compatible models
});

// Comprehensive Daikin Unit Specifications
export const daikinUnitSpecSchema = z.object({
  id: z.string(),
  modelNumber: z.string(),
  brand: z.literal("Daikin"),
  
  // Core specifications
  systemType: systemTypeEnum,
  tonnage: tonnageEnum,
  btuCapacity: z.number(),
  voltage: voltageEnum,
  phases: phaseEnum,
  
  // Performance ratings
  seerRating: z.number(),
  eerRating: z.number().optional(),
  hspfRating: z.number().optional(), // Heat pumps only
  
  // Technical specifications
  refrigerant: refrigerantEnum,
  driveType: driveTypeEnum,
  coolingStages: z.number(),
  heatingStages: z.number().optional(),
  soundLevel: z.number(), // dB
  
  // Physical specifications
  dimensions: z.object({
    length: z.number(), // inches
    width: z.number(),
    height: z.number()
  }),
  weight: z.number(), // lbs
  
  // System components
  heatExchanger: z.string().optional(),
  controls: z.array(z.string()),
  sensors: z.array(z.string()),
  coils: z.string().optional(),
  economizers: z.array(z.string()).optional(),
  
  // Add-ons and accessories
  electricalAddOns: z.array(factoryInstalledOptionSchema).default([]),
  fieldAccessories: z.array(fieldAccessorySchema).default([]),
  
  // Service and warranty
  serviceOptions: z.array(z.string()).default([]),
  warranty: z.number().default(5), // years
  
  // Indoor Air Quality features
  iaqFeatures: z.array(z.string()).default([]),
  
  // Gas-specific fields for Gas/Electric systems
  heatingBTU: z.number().optional(),
  gasCategory: gasCategoryEnum.optional(),
  
  // Heat pump specific fields
  heatKitKW: z.number().optional(),
  lowTempOperation: z.number().optional() // Minimum operating temperature
});

export type DaikinUnitSpec = z.infer<typeof daikinUnitSpecSchema>;

// ============================================================================
// DAIKIN CATALOG TYPES
// ============================================================================

// Nomenclature segments for building Daikin model numbers
export const nomenclatureSegmentSchema = z.object({
  position: z.number(),
  code: z.string(),
  description: z.string(),
  options: z.array(z.object({
    value: z.string(),
    description: z.string(),
    implications: z.array(z.string()).optional() // What this option affects
  }))
});

// Daikin Product Family template
export const daikinFamilySchema = z.object({
  familyName: z.string(), // "DZ17SA", "DZ20SA", etc.
  modelTemplate: z.string(), // Template pattern like "DZ{size}{variant}{voltage}"
  systemType: systemTypeEnum,
  availableTonnages: z.array(tonnageEnum),
  availableVoltages: z.array(voltageEnum),
  availablePhases: z.array(phaseEnum),
  refrigerant: refrigerantEnum.default("R-32"),
  nomenclatureSegments: z.array(nomenclatureSegmentSchema),
  baseSpecs: z.object({
    seerRange: z.object({ min: z.number(), max: z.number() }),
    soundLevel: z.object({ min: z.number(), max: z.number() }),
    driveType: driveTypeEnum,
    warranty: z.number().default(10)
  })
});

export type DaikinFamily = z.infer<typeof daikinFamilySchema>;

// Real-time model builder for configuration editor
export const modelBuilderSchema = z.object({
  familyName: z.string(),
  currentModel: z.string(),
  segments: z.array(z.object({
    position: z.number(),
    selectedValue: z.string(),
    availableOptions: z.array(z.string())
  })),
  computedSpecs: daikinUnitSpecSchema.optional(),
  isValid: z.boolean(),
  validationErrors: z.array(z.string()).default([])
});

export type ModelBuilder = z.infer<typeof modelBuilderSchema>;

// Nominal tonnage mapping for easy lookup
export const nominalTonnagesSchema = z.array(
  z.object({
    tonnage: tonnageEnum,
    btuCapacity: z.number(),
    minBTU: z.number(),
    maxBTU: z.number()
  })
);

export type NominalTonnages = z.infer<typeof nominalTonnagesSchema>;

// Standard Daikin families available in R-32
export const daikinFamiliesEnum = z.enum([
  "DZ17SA", "DZ20SA", "DZ16SA", "DZ13SA", // Split systems
  "DZ17VC", "DZ20VC", "DZ16VC", "DZ13VC", // Variable capacity
  "DZ17TC", "DZ20TC", // Two-stage
  "DZR17SA", "DZR20SA" // Residential lines
]);

export type DaikinFamilies = z.infer<typeof daikinFamiliesEnum>;

export const parsedModelSchema = z.object({
  modelNumber: z.string(),
  manufacturer: z.string(),
  confidence: z.number().min(0).max(100),
  systemType: systemTypeEnum,
  btuCapacity: z.number(),
  voltage: z.string(),
  phases: z.string(),
  specifications: z.array(z.object({
    label: z.string(),
    value: z.string(),
    unit: z.string().optional()
  }))
});

export type ParsedModel = z.infer<typeof parsedModelSchema>;

// ============================================================================
// PROJECT MANAGEMENT TYPES
// ============================================================================

// User profile for project ownership
export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  company: z.string().optional(),
  preferences: z.object({
    defaultEfficiency: efficiencyEnum.default("standard"),
    preferredVoltagePriority: z.array(voltageEnum).default(["208-230", "460", "575"]),
    showAdvancedOptions: z.boolean().default(false)
  }).default({})
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// Project item representing one unit replacement in a project
export const projectItemSchema = z.object({
  id: z.string(),
  originalUnit: parsedModelSchema,
  chosenReplacement: z.lazy(() => enhancedReplacementSchema), // Forward reference
  configuration: z.object({
    electricalAddOns: z.array(z.string()).default([]),
    fieldAccessories: z.array(z.string()).default([]),
    customOptions: z.record(z.string()).default({})
  }).default({}),
  notes: z.string().default(""),
  status: z.enum(["pending", "configured", "approved", "ordered"]).default("pending")
});

export type ProjectItem = z.infer<typeof projectItemSchema>;

// Project schema with 20-unit limit
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  description: z.string().optional(),
  items: z.array(projectItemSchema).max(20, "Projects are limited to 20 units maximum"),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  status: z.enum(["draft", "in_progress", "completed"]).default("draft")
});

export type Project = z.infer<typeof projectSchema>;

// ============================================================================
// ENHANCED REPLACEMENT SCHEMA
// ============================================================================

// Enhanced replacement with comprehensive specs and sizing logic
export const enhancedReplacementSchema = z.object({
  id: z.string(),
  modelNumber: z.string(),
  brand: z.literal("Daikin"),
  systemType: systemTypeEnum,
  tonnage: tonnageEnum,
  btuCapacity: z.number(),
  voltage: voltageEnum,
  phases: phaseEnum,
  
  // Comprehensive specifications from daikinUnitSpecSchema
  seerRating: z.number(),
  eerRating: z.number().optional(),
  hspfRating: z.number().optional(),
  refrigerant: refrigerantEnum,
  driveType: driveTypeEnum,
  coolingStages: z.number(),
  heatingStages: z.number().optional(),
  soundLevel: z.number(),
  
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number()
  }),
  weight: z.number(),
  
  // Smart sizing match
  sizeMatch: z.enum(["smaller", "direct", "larger"]),
  sizingRatio: z.number(), // actual capacity / original capacity
  
  // Available options
  electricalAddOns: z.array(factoryInstalledOptionSchema).default([]),
  fieldAccessories: z.array(fieldAccessorySchema).default([]),
  
  // Computed values
  computedModelString: z.string(),
  alternativeModels: z.array(z.string()).default([]),
  
  // Legacy compatibility
  specifications: z.array(z.object({
    label: z.string(),
    value: z.string(),
    unit: z.string().optional()
  }))
});

export type EnhancedReplacement = z.infer<typeof enhancedReplacementSchema>;

// Legacy replacement schema for backward compatibility
export const replacementSchema = z.object({
  id: z.string(),
  modelNumber: z.string(),
  systemType: systemTypeEnum,
  btuCapacity: z.number(),
  voltage: z.string(),
  phases: z.string(),
  specifications: z.array(z.object({
    label: z.string(),
    value: z.string(),
    unit: z.string().optional()
  })),
  sizeMatch: z.enum(["smaller", "direct", "larger"])
});

export type Replacement = z.infer<typeof replacementSchema>;

// API Response schemas
export const decodeResponseSchema = z.object({
  originalUnit: parsedModelSchema,
  replacements: z.array(replacementSchema)
});

export type DecodeResponse = z.infer<typeof decodeResponseSchema>;

// Spec search response schema
export const specSearchResponseSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    modelNumber: z.string(),
    systemType: z.enum(["Heat Pump", "Gas/Electric", "Straight A/C"]),
    btuCapacity: z.number(),
    voltage: z.string(),
    phases: z.string(),
    specifications: z.array(z.object({
      label: z.string(),
      value: z.string(),
      unit: z.string().optional()
    }))
  })),
  count: z.number()
});

export type SpecSearchResponse = z.infer<typeof specSearchResponseSchema>;

// ============================================================================
// SMART SIZING LOGIC HELPERS
// ============================================================================

// BTU to Tonnage conversion utilities
export const btuToTonnageConversionSchema = z.object({
  btuCapacity: z.number(),
  exactTonnage: z.number(), // Calculated exact tonnage (btu / 12000)
  nearestStandardTonnage: tonnageEnum, // Rounded to nearest standard size
  sizingDifference: z.number(), // Percentage difference from exact
  recommendedSizes: z.array(z.object({
    tonnage: tonnageEnum,
    matchType: z.enum(["smaller", "direct", "larger"]),
    percentDifference: z.number(),
    recommended: z.boolean()
  }))
});

export type BTUToTonnageConversion = z.infer<typeof btuToTonnageConversionSchema>;

// Sizing match logic for replacement recommendations
export const sizingMatchSchema = z.object({
  originalCapacity: z.number(),
  replacementCapacity: z.number(),
  sizingRatio: z.number(), // replacement / original
  matchCategory: z.enum(["undersized", "direct", "oversized"]),
  acceptableMatch: z.boolean(), // Within 10% tolerance
  toleranceRange: z.object({
    minCapacity: z.number(), // 90% of original
    maxCapacity: z.number()  // 110% of original
  })
});

export type SizingMatch = z.infer<typeof sizingMatchSchema>;

// Comprehensive replacement recommendation with sizing analysis
export const sizingRecommendationSchema = z.object({
  originalUnit: parsedModelSchema,
  recommendedReplacements: z.array(enhancedReplacementSchema),
  sizingAnalysis: z.object({
    originalTonnage: tonnageEnum,
    availableSizes: z.array(tonnageEnum),
    directMatches: z.array(enhancedReplacementSchema),
    smallerOptions: z.array(enhancedReplacementSchema),
    largerOptions: z.array(enhancedReplacementSchema),
    bestMatch: enhancedReplacementSchema.optional()
  })
});

export type SizingRecommendation = z.infer<typeof sizingRecommendationSchema>;

// Standard tonnage mapping with BTU ranges for smart matching
export const standardTonnageMapSchema = z.array(
  z.object({
    tonnage: tonnageEnum,
    nominalBTU: z.number(),
    acceptableRange: z.object({
      minBTU: z.number(),
      maxBTU: z.number()
    }),
    commonApplications: z.array(z.string()).optional()
  })
);

export type StandardTonnageMap = z.infer<typeof standardTonnageMapSchema>;

// Helper schema for compatibility checking
export const compatibilityCheckSchema = z.object({
  originalSpecs: z.object({
    systemType: systemTypeEnum,
    voltage: z.string(),
    phases: z.string(),
    refrigerant: z.string().optional()
  }),
  replacementSpecs: z.object({
    systemType: systemTypeEnum,
    voltage: voltageEnum,
    phases: phaseEnum,
    refrigerant: refrigerantEnum
  }),
  compatibility: z.object({
    systemTypeMatch: z.boolean(),
    voltageMatch: z.boolean(),
    phaseMatch: z.boolean(),
    refrigerantCompatible: z.boolean(),
    overallCompatible: z.boolean(),
    warnings: z.array(z.string()).default([])
  })
});

export type CompatibilityCheck = z.infer<typeof compatibilityCheckSchema>;

// Enhanced API response schemas with new comprehensive data
export const enhancedDecodeResponseSchema = z.object({
  originalUnit: parsedModelSchema,
  sizingRecommendation: sizingRecommendationSchema,
  alternativeOptions: z.array(enhancedReplacementSchema).optional(),
  projectId: z.string().optional() // If saving to project
});

export type EnhancedDecodeResponse = z.infer<typeof enhancedDecodeResponseSchema>;

export const enhancedSpecSearchResponseSchema = z.object({
  results: z.array(enhancedReplacementSchema),
  count: z.number(),
  searchCriteria: specSearchInputSchema,
  availableFilters: z.object({
    tonnages: z.array(tonnageEnum),
    voltages: z.array(voltageEnum),
    phases: z.array(phaseEnum),
    efficiencies: z.array(efficiencyEnum),
    driveTypes: z.array(driveTypeEnum)
  })
});

export type EnhancedSpecSearchResponse = z.infer<typeof enhancedSpecSearchResponseSchema>;

// ============================================================================
// POSITION-BASED MODEL BUILDING ARCHITECTURE
// ============================================================================

// Model positions for position-based building
export const modelPositionsSchema = z.object({
  p1: z.string(),        // Brand (D)
  p2: z.string(),        // Tier (S/H)
  p3: z.string(),        // Application (C/G/H)
  p4_p6: z.string(),     // Capacity (036-300)
  p7: z.string(),        // Voltage (1/3/4/7)
  p8: z.string(),        // Supply Fan/Drive (D/L/W)
  p9_p11: z.string(),    // Heat Field (Gas BTU or Electric kW)
  p12: z.string(),       // Controls (A/B/C)
  p13: z.string(),       // Refrigeration System (A/C/F/G/H)
  p14: z.string(),       // Heat Exchanger (X/A/S/U)
  p15_p24: z.string()    // Options Block (10 characters)
});

export type ModelPositions = z.infer<typeof modelPositionsSchema>;

// Fallback strategy for mathematical matching
export const fallbackStrategySchema = z.object({
  selection_strategy: z.enum(["nearest", "exact"]),
  tie_breaker: z.enum(["round_half_up_to_higher", "round_half_down_to_lower"]),
  bounds_strategy: z.enum(["clip_to_min_max", "error_on_bounds"])
});

export type FallbackStrategy = z.infer<typeof fallbackStrategySchema>;

// Size ladder for neighboring matches
export const sizeLadderSchema = <T extends z.ZodSchema>(valueSchema: T) =>
  z.object({
    direct_match: z.object({
      code: z.string(),
      value: valueSchema
    }),
    size_smaller: z.object({
      code: z.string(),
      value: valueSchema
    }).nullable(),
    size_larger: z.object({
      code: z.string(),
      value: valueSchema
    }).nullable()
  });

// Specific size ladder types
export const capacitySizeLadderSchema = sizeLadderSchema(z.number());
export const gasBtuSizeLadderSchema = sizeLadderSchema(z.number());
export const electricKwSizeLadderSchema = sizeLadderSchema(z.number());

export type CapacitySizeLadder = z.infer<typeof capacitySizeLadderSchema>;
export type GasBtuSizeLadder = z.infer<typeof gasBtuSizeLadderSchema>;
export type ElectricKwSizeLadder = z.infer<typeof electricKwSizeLadderSchema>;

// ============================================================================
// FAMILY-SPECIFIC DEFINITIONS
// ============================================================================

// Daikin family configuration
export const daikinFamilyConfigSchema = z.object({
  series_prefix: z.string(),
  type: z.string(),
  defaults: modelPositionsSchema.partial(),
  capacity_allowed: z.array(z.string()),
  controls_allowed: z.array(z.string()),
  requires_gas_btu: z.boolean().optional(),
  requires_electric_heat: z.boolean().optional(),
  voltage_phase_combinations: z.array(z.object({
    voltage_code: z.string(),
    phase_code: z.string(),
    description: z.string()
  })).optional(),
  min_capacity_tons: z.number().optional(),
  max_capacity_tons: z.number().optional()
});

export type DaikinFamilyConfig = z.infer<typeof daikinFamilyConfigSchema>;

// Family definitions enum
export const daikinFamilyKeysEnum = z.enum([
  "DSC",        // Straight A/C - Standard
  "DHC",        // Straight A/C - High
  "DSG",        // Gas/Electric - Standard
  "DHG",        // Gas/Electric - High
  "DSH_3to6",   // Heat Pump - Standard (3-6T)
  "DSH_7p5to10", // Heat Pump - Standard (7.5-10T)
  "DHH"         // Heat Pump - High (3-6T)
]);

export type DaikinFamilyKeys = z.infer<typeof daikinFamilyKeysEnum>;

// Complete family definitions mapping
export const familyDefinitionsSchema = z.record(
  daikinFamilyKeysEnum,
  daikinFamilyConfigSchema
);

export type FamilyDefinitions = z.infer<typeof familyDefinitionsSchema>;

// ============================================================================
// ENHANCED RESULT TYPES
// ============================================================================

// Enhanced replacement result with comprehensive matching
export const enhancedReplacementResultSchema = z.object({
  model: z.string(),
  capacity_match: capacitySizeLadderSchema,
  gas_btu_match: gasBtuSizeLadderSchema.optional(),
  electric_kw_match: electricKwSizeLadderSchema.optional(),
  specifications: daikinUnitSpecSchema,
  family: daikinFamilyKeysEnum,
  positions: modelPositionsSchema,
  match_quality: z.object({
    capacity_exactness: z.number(), // 0-1 score
    gas_btu_exactness: z.number().optional(),
    electric_kw_exactness: z.number().optional(),
    overall_score: z.number(),
    match_explanation: z.string()
  }),
  fallback_applied: z.object({
    capacity: z.boolean(),
    gas_btu: z.boolean().optional(),
    electric_kw: z.boolean().optional(),
    bounds_clipping: z.array(z.string()).default([])
  })
});

export type EnhancedReplacementResult = z.infer<typeof enhancedReplacementResultSchema>;

// ============================================================================
// POSITION MAPPING INTERFACES
// ============================================================================

// Position value mappings
export const positionMappingSchema = z.object({
  p1: z.record(z.string(), z.string()), // Brand codes
  p2: z.record(z.string(), z.string()), // Tier codes
  p3: z.record(z.string(), z.string()), // Application codes
  p4_p6: z.record(z.string(), z.number()), // Capacity codes to tonnage
  p7: z.record(z.string(), z.string()), // Voltage codes
  p8: z.record(z.string(), z.string()), // Supply fan/drive codes
  p9_p11_gas: z.record(z.string(), z.number()), // Gas BTU codes
  p9_p11_electric: z.record(z.string(), z.number()), // Electric kW codes
  p12: z.record(z.string(), z.string()), // Controls codes
  p13: z.record(z.string(), z.string()), // Refrigeration system codes
  p14: z.record(z.string(), z.string())  // Heat exchanger codes
});

export type PositionMapping = z.infer<typeof positionMappingSchema>;

// ============================================================================
// MODEL BUILDING REQUEST/RESPONSE SCHEMAS
// ============================================================================

// Request to build model with fallback
export const buildModelRequestSchema = z.object({
  family: daikinFamilyKeysEnum,
  tons: z.number().positive(),
  voltage: z.string(),
  fan_drive: z.string().optional().default("D"),
  controls: z.string().optional().default("A"),
  refrig_sys: z.string().optional().default("A"),
  gas_btu_numeric: z.number().optional(),
  electric_kw: z.number().optional(),
  heat_exchanger: z.string().optional().default("X"),
  accessories: z.record(z.string()).optional().default({}),
  fallback_strategy: fallbackStrategySchema.optional()
});

export type BuildModelRequest = z.infer<typeof buildModelRequestSchema>;

// Response from model building
export const buildModelResponseSchema = z.object({
  success: z.boolean(),
  result: enhancedReplacementResultSchema.optional(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  validation_results: z.object({
    family_compatible: z.boolean(),
    capacity_valid: z.boolean(),
    gas_btu_valid: z.boolean().optional(),
    voltage_phase_valid: z.boolean(),
    all_positions_valid: z.boolean()
  })
});

export type BuildModelResponse = z.infer<typeof buildModelResponseSchema>;

// ============================================================================
// MODEL PARSING SCHEMAS
// ============================================================================

// Parse model to positions request
export const parseModelRequestSchema = z.object({
  model_number: z.string().min(3).max(50),
  validate: z.boolean().default(true)
});

export type ParseModelRequest = z.infer<typeof parseModelRequestSchema>;

// Parse model to positions response
export const parseModelResponseSchema = z.object({
  success: z.boolean(),
  positions: modelPositionsSchema.optional(),
  family: daikinFamilyKeysEnum.optional(),
  parsed_values: z.object({
    brand: z.string().optional(),
    tier: z.string().optional(),
    application: z.string().optional(),
    capacity_tons: z.number().optional(),
    voltage_description: z.string().optional(),
    gas_btu: z.number().optional(),
    electric_kw: z.number().optional()
  }).optional(),
  validation_errors: z.array(z.string()).default([])
});

export type ParseModelResponse = z.infer<typeof parseModelResponseSchema>;

// ============================================================================
// ADVANCED MATCHING SCHEMAS
// ============================================================================

// Advanced matching request with multiple strategies
export const advancedMatchingRequestSchema = z.object({
  original_capacity: z.number(),
  original_gas_btu: z.number().optional(),
  original_electric_kw: z.number().optional(),
  preferred_families: z.array(daikinFamilyKeysEnum).optional(),
  voltage_preference: z.array(z.string()).optional(),
  efficiency_preference: efficiencyEnum.optional(),
  fallback_strategy: fallbackStrategySchema.optional(),
  include_size_ladders: z.boolean().default(true),
  max_results: z.number().min(1).max(50).default(10)
});

export type AdvancedMatchingRequest = z.infer<typeof advancedMatchingRequestSchema>;

// Advanced matching response
export const advancedMatchingResponseSchema = z.object({
  matches: z.array(enhancedReplacementResultSchema),
  matching_summary: z.object({
    total_matches: z.number(),
    exact_matches: z.number(),
    fallback_matches: z.number(),
    families_searched: z.array(daikinFamilyKeysEnum),
    best_match_score: z.number()
  }),
  size_analysis: z.object({
    original_tonnage_exact: z.number(),
    nearest_standard_tonnage: tonnageEnum,
    capacity_ladders_generated: z.number(),
    gas_btu_ladders_generated: z.number(),
    electric_kw_ladders_generated: z.number()
  }).optional()
});

export type AdvancedMatchingResponse = z.infer<typeof advancedMatchingResponseSchema>;

// ============================================================================
// VALIDATION AND UTILITY SCHEMAS
// ============================================================================

// Family validation request
export const familyValidationRequestSchema = z.object({
  positions: modelPositionsSchema,
  family: daikinFamilyKeysEnum
});

export type FamilyValidationRequest = z.infer<typeof familyValidationRequestSchema>;

// Family validation response
export const familyValidationResponseSchema = z.object({
  is_valid: z.boolean(),
  validation_details: z.object({
    capacity_valid: z.boolean(),
    controls_valid: z.boolean(),
    gas_btu_required_check: z.boolean().optional(),
    electric_heat_check: z.boolean().optional(),
    voltage_phase_check: z.boolean()
  }),
  errors: z.array(z.string()).default([]),
  suggested_corrections: z.array(z.object({
    position: z.string(),
    current_value: z.string(),
    suggested_value: z.string(),
    reason: z.string()
  })).default([])
});

export type FamilyValidationResponse = z.infer<typeof familyValidationResponseSchema>;

// ============================================================================
// COMPREHENSIVE API RESPONSE UPDATES
// ============================================================================

// Enhanced decode response with position-based results
export const positionBasedDecodeResponseSchema = z.object({
  originalUnit: parsedModelSchema,
  enhanced_results: z.array(enhancedReplacementResultSchema),
  position_analysis: z.object({
    parsed_positions: modelPositionsSchema.optional(),
    detected_family: daikinFamilyKeysEnum.optional(),
    capacity_ladder: capacitySizeLadderSchema.optional(),
    gas_btu_ladder: gasBtuSizeLadderSchema.optional(),
    electric_kw_ladder: electricKwSizeLadderSchema.optional()
  }),
  legacy_compatibility: z.object({
    legacy_replacements: z.array(replacementSchema),
    enhanced_replacements: z.array(enhancedReplacementSchema)
  }),
  matching_metadata: z.object({
    total_processing_time_ms: z.number(),
    fallback_strategies_used: z.array(z.string()),
    families_evaluated: z.array(daikinFamilyKeysEnum),
    match_confidence_score: z.number()
  })
});

export type PositionBasedDecodeResponse = z.infer<typeof positionBasedDecodeResponseSchema>;

// Enhanced spec search with position-based filtering
export const positionBasedSpecSearchResponseSchema = z.object({
  results: z.array(enhancedReplacementResultSchema),
  count: z.number(),
  search_metadata: z.object({
    families_searched: z.array(daikinFamilyKeysEnum),
    capacity_ladders_used: z.number(),
    fallback_applied: z.boolean(),
    exact_matches: z.number(),
    near_matches: z.number()
  }),
  available_refinements: z.object({
    families: z.array(daikinFamilyKeysEnum),
    capacity_ranges: z.array(z.object({
      family: daikinFamilyKeysEnum,
      min_tons: z.number(),
      max_tons: z.number(),
      available_sizes: z.array(z.string())
    })),
    voltage_options: z.array(z.string()),
    efficiency_tiers: z.array(efficiencyEnum)
  })
});

export type PositionBasedSpecSearchResponse = z.infer<typeof positionBasedSpecSearchResponseSchema>;

// ============================================================================
// DATABASE TABLE DEFINITIONS FOR PROJECT MANAGEMENT
// ============================================================================

// Users table for profile management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  company: text("company"),
  preferences: json("preferences").default(sql`'{}'`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ownerId: varchar("owner_id").notNull(),
  description: text("description"),
  customerName: text("customer_name"),
  customerLocation: text("customer_location"),
  projectDate: timestamp("project_date"),
  status: text("status").notNull().default("draft"), // draft, in_progress, completed
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Project units table (junction table for project-unit relationships)
export const projectUnits = pgTable("project_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  originalModelNumber: text("original_model_number").notNull(),
  originalManufacturer: text("original_manufacturer").notNull(),
  chosenReplacementId: text("chosen_replacement_id").notNull(),
  chosenReplacementModel: text("chosen_replacement_model").notNull(),
  configuration: json("configuration").default(sql`'{}'`), // electrical add-ons, accessories, etc.
  notes: text("notes").default(""),
  status: text("status").notNull().default("pending"), // pending, configured, approved, ordered
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
});

export const insertProjectUnitSchema = createInsertSchema(projectUnits).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertProjectUnit = z.infer<typeof insertProjectUnitSchema>;
export type ProjectUnit = typeof projectUnits.$inferSelect;

// API request/response schemas for project operations
export const createProjectRequestSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  customerName: z.string().optional(),
  customerLocation: z.string().optional(),
  projectDate: z.string().datetime().optional()
});

export const updateProjectRequestSchema = createProjectRequestSchema.partial();

export const addUnitToProjectRequestSchema = z.object({
  projectId: z.string(),
  originalUnit: parsedModelSchema,
  chosenReplacement: enhancedReplacementSchema,
  configuration: z.object({
    electricalAddOns: z.array(z.string()).default([]),
    fieldAccessories: z.array(z.string()).default([]),
    customOptions: z.record(z.string()).default({})
  }).default({}),
  notes: z.string().default("")
});

export const projectListResponseSchema = z.object({
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    customerName: z.string().nullable().optional(),
    status: z.string(),
    unitCount: z.number(),
    remainingCapacity: z.number(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  totalCount: z.number()
});

export const projectDetailResponseSchema = z.object({
  project: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    customerName: z.string().nullable().optional(),
    customerLocation: z.string().nullable().optional(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
  }),
  units: z.array(z.object({
    id: z.string(),
    originalModelNumber: z.string(),
    originalManufacturer: z.string(),
    chosenReplacementModel: z.string(),
    configuration: z.record(z.any()).default({}),
    notes: z.string(),
    status: z.string(),
    createdAt: z.string()
  })),
  unitCount: z.number(),
  remainingCapacity: z.number()
});

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export type AddUnitToProjectRequest = z.infer<typeof addUnitToProjectRequestSchema>;
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;
export type ProjectDetailResponse = z.infer<typeof projectDetailResponseSchema>;

// ============================================================================
// STANDARDIZED ERROR RESPONSE SCHEMAS
// ============================================================================

// Standard error response structure
export const errorResponseSchema = z.object({
  error: z.string(), // Error type/category
  message: z.string(), // Human-readable error message
  code: z.string().optional(), // Machine-readable error code
  details: z.any().optional(), // Additional error details (validation errors, etc.)
  timestamp: z.string().optional(), // ISO timestamp of error
  requestId: z.string().optional() // Request tracking ID
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// Specific error types
export const validationErrorResponseSchema = errorResponseSchema.extend({
  error: z.literal("Validation error"),
  code: z.literal("VALIDATION_FAILED"),
  details: z.array(z.object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
    code: z.string()
  }))
});

export const notFoundErrorResponseSchema = errorResponseSchema.extend({
  error: z.literal("Not found"),
  code: z.literal("RESOURCE_NOT_FOUND")
});

export const conflictErrorResponseSchema = errorResponseSchema.extend({
  error: z.literal("Conflict"),
  code: z.literal("RESOURCE_CONFLICT")
});

export const capacityErrorResponseSchema = errorResponseSchema.extend({
  error: z.literal("Project capacity exceeded"),
  code: z.literal("PROJECT_CAPACITY_EXCEEDED")
});

export const internalErrorResponseSchema = errorResponseSchema.extend({
  error: z.literal("Internal server error"),
  code: z.literal("INTERNAL_SERVER_ERROR")
});

export type ValidationErrorResponse = z.infer<typeof validationErrorResponseSchema>;
export type NotFoundErrorResponse = z.infer<typeof notFoundErrorResponseSchema>;
export type ConflictErrorResponse = z.infer<typeof conflictErrorResponseSchema>;
export type CapacityErrorResponse = z.infer<typeof capacityErrorResponseSchema>;
export type InternalErrorResponse = z.infer<typeof internalErrorResponseSchema>;

// Union of all possible error responses
export const apiErrorResponseSchema = z.union([
  validationErrorResponseSchema,
  notFoundErrorResponseSchema,
  conflictErrorResponseSchema,
  capacityErrorResponseSchema,
  internalErrorResponseSchema
]);

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
