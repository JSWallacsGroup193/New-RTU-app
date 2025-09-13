import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { HVACModelParser } from "./services/hvacParser";
import { DaikinMatcher } from "./services/daikinMatcher";
import { decodeResponseSchema, specSearchResponseSchema, specSearchInputSchema } from "@shared/schema";
import { z } from "zod";

// Initialize services
const parser = new HVACModelParser();
const matcher = new DaikinMatcher();

// Request validation schemas
const decodeRequestSchema = z.object({
  modelNumber: z.string().min(3).max(50).trim()
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
      const results = matcher.searchBySpecInput(searchInput);
      
      const response = {
        results: results,
        count: results.length,
        searchCriteria: {
          ...searchInput,
          computedBTURange: btuRange
        }
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
