import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
export const parsedModelSchema = z.object({
  modelNumber: z.string(),
  manufacturer: z.string(),
  confidence: z.number().min(0).max(100),
  systemType: z.enum(["Heat Pump", "Gas/Electric", "Straight A/C"]),
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

// Replacement recommendation
export const replacementSchema = z.object({
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
