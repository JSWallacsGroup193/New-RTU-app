import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { HVACModelParser } from "./services/hvacParser";
import { DaikinMatcher } from "./services/daikinMatcher";
import { decodeResponseSchema, specSearchResponseSchema } from "@shared/schema";
import { z } from "zod";

// Initialize services
const parser = new HVACModelParser();
const matcher = new DaikinMatcher();

// Request validation schemas
const decodeRequestSchema = z.object({
  modelNumber: z.string().min(3).max(50).trim()
});

const specSearchRequestSchema = z.object({
  btuMin: z.number().min(6000).max(200000),
  btuMax: z.number().min(6000).max(200000),
  systemType: z.enum(["Heat Pump", "Gas/Electric", "Straight A/C"]).optional(),
  voltage: z.string().optional()
});

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

  // Specification-based search endpoint
  app.post("/api/search-specs", async (req, res) => {
    try {
      // Validate request
      const { btuMin, btuMax, systemType, voltage } = specSearchRequestSchema.parse(req.body);
      
      if (btuMin >= btuMax) {
        return res.status(400).json({
          error: "Invalid range",
          message: "Minimum BTU must be less than maximum BTU"
        });
      }
      
      // Search Daikin units by specifications
      const results = matcher.searchBySpecs(btuMin, btuMax, systemType, voltage);
      
      const response = {
        results: results,
        count: results.length
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
      
      console.error("Spec search error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while searching specifications"
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        parser: "ready",
        matcher: "ready",
        storage: "ready"
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
