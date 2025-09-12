import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean } from "drizzle-orm/pg-core";
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
  "6.0", "7.5", "10.0", "12.5", "15.0", "17.5", "20.0", "25.0"
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
