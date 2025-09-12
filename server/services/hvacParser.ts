import type { ParsedModel } from "@shared/schema";

interface ManufacturerPattern {
  name: string;
  patterns: RegExp[];
  parser: (modelNumber: string, match: RegExpMatchArray) => Partial<ParsedModel> | null;
}

// BTU capacity lookup tables based on common manufacturer sizing codes
const BTU_MAPPINGS: Record<string, Record<string, number>> = {
  // Carrier/Bryant sizing codes
  carrier: {
    "018": 18000, "24": 24000, "30": 30000, "36": 36000, "42": 42000,
    "48": 48000, "60": 60000, "048": 48000, "060": 60000
  },
  // Trane sizing codes  
  trane: {
    "18": 18000, "24": 24000, "30": 30000, "36": 36000, "42": 42000,
    "48": 48000, "60": 60000, "072": 72000, "090": 90000
  },
  // York sizing codes
  york: {
    "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000
  },
  // Lennox sizing codes
  lennox: {
    "18": 18000, "24": 24000, "30": 30000, "36": 36000, "42": 42000,
    "48": 48000, "60": 60000
  },
  // Goodman sizing codes
  goodman: {
    "18": 18000, "24": 24000, "30": 30000, "36": 36000, "42": 42000,
    "48": 48000, "60": 60000
  },
  // Rheem sizing codes
  rheem: {
    "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000
  }
};

const VOLTAGE_MAPPINGS: Record<string, string> = {
  "A": "208-230", "B": "460", "C": "575", "4": "208-230", "5": "460", "6": "575",
  "1": "208-230", "2": "460", "3": "575"
};

const PHASE_MAPPINGS: Record<string, string> = {
  "1": "1", "3": "3", "A": "1", "B": "3"
};

// Manufacturer-specific parsing patterns
const MANUFACTURER_PATTERNS: ManufacturerPattern[] = [
  {
    name: "Carrier",
    patterns: [
      /^(50|38)[A-Z]{2,3}([0-9]{3,4})[A-Z0-9]*$/i, // 50TCQA04, 38HDR048
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i // Generic Carrier pattern
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2];
      const btuCapacity = BTU_MAPPINGS.carrier[sizeCode];
      if (!btuCapacity) return null;

      const systemType = modelNumber.includes("TC") ? "Heat Pump" :
                        modelNumber.includes("HD") ? "Gas/Electric" : "Straight A/C";

      return {
        manufacturer: "Carrier",
        confidence: 90,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER Rating", value: "16" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "72", unit: "dB" }
        ]
      };
    }
  },
  {
    name: "Trane",
    patterns: [
      /^([0-9]{3})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i, // 4TTR6036, 2TWR2036
      /^([A-Z]{3})([0-9]{2,3})[A-Z0-9]*$/i // TWR036A1000AA
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.trane[sizeCode];
      if (!btuCapacity) return null;

      const systemType = modelNumber.includes("TTR") || modelNumber.includes("TWR") ? "Heat Pump" :
                        modelNumber.includes("TUD") ? "Gas/Electric" : "Straight A/C";

      return {
        manufacturer: "Trane",
        confidence: 88,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER Rating", value: "16" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "71", unit: "dB" }
        ]
      };
    }
  },
  {
    name: "York",
    patterns: [
      /^([A-Z]{2,4})([0-9]{3})[A-Z0-9]*$/i, // YCJF36S41S2, YHJF48S41S3
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.york[sizeCode];
      if (!btuCapacity) return null;

      const systemType = modelNumber.includes("YCJ") || modelNumber.includes("YHJ") ? "Heat Pump" :
                        modelNumber.includes("YMG") ? "Gas/Electric" : "Straight A/C";

      return {
        manufacturer: "York",
        confidence: 92,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230", 
        phases: "1",
        specifications: [
          { label: "SEER Rating", value: "16" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "73", unit: "dB" }
        ]
      };
    }
  },
  {
    name: "Lennox",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // XP16-036-230, HP21-048-230
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.lennox[sizeCode];
      if (!btuCapacity) return null;

      const systemType = modelNumber.includes("XP") || modelNumber.includes("HP") ? "Heat Pump" :
                        modelNumber.includes("GM") ? "Gas/Electric" : "Straight A/C";

      return {
        manufacturer: "Lennox",
        confidence: 85,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1", 
        specifications: [
          { label: "SEER Rating", value: "16" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "74", unit: "dB" }
        ]
      };
    }
  },
  {
    name: "Goodman",
    patterns: [
      /^([A-Z]{3,4})([0-9]{2,3})[A-Z0-9]*$/i, // GSZ160361, DSXC180361
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.goodman[sizeCode];
      if (!btuCapacity) return null;

      const systemType = modelNumber.includes("GSZ") || modelNumber.includes("DSX") ? "Heat Pump" :
                        modelNumber.includes("GME") ? "Gas/Electric" : "Straight A/C";

      return {
        manufacturer: "Goodman",
        confidence: 78,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER Rating", value: "14" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "75", unit: "dB" }
        ]
      };
    }
  },
  {
    name: "Rheem",
    patterns: [
      /^([A-Z]{2,4})([0-9]{3})[A-Z0-9]*$/i, // RP1448AJ1NA, RA1448AJ1NA
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.rheem[sizeCode];
      if (!btuCapacity) return null;

      const systemType = modelNumber.includes("RP") ? "Heat Pump" :
                        modelNumber.includes("RGR") ? "Gas/Electric" : "Straight A/C";

      return {
        manufacturer: "Rheem",
        confidence: 91,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER Rating", value: "16" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "73", unit: "dB" }
        ]
      };
    }
  }
];

export class HVACModelParser {
  public parseModelNumber(modelNumber: string): ParsedModel | null {
    const cleanModel = modelNumber.trim().toUpperCase();
    
    for (const manufacturerPattern of MANUFACTURER_PATTERNS) {
      for (const pattern of manufacturerPattern.patterns) {
        const match = cleanModel.match(pattern);
        if (match) {
          const parsed = manufacturerPattern.parser(cleanModel, match);
          if (parsed) {
            return {
              modelNumber: cleanModel,
              manufacturer: manufacturerPattern.name,
              confidence: parsed.confidence || 80,
              systemType: parsed.systemType || "Straight A/C",
              btuCapacity: parsed.btuCapacity || 0,
              voltage: parsed.voltage || "208-230",
              phases: parsed.phases || "1",
              specifications: parsed.specifications || []
            };
          }
        }
      }
    }

    // Fallback generic parsing attempt
    return this.attemptGenericParsing(cleanModel);
  }

  private attemptGenericParsing(modelNumber: string): ParsedModel | null {
    // Try to extract capacity from common patterns
    const capacityMatch = modelNumber.match(/([0-9]{2,3})/);
    if (capacityMatch) {
      const sizeCode = capacityMatch[1];
      let btuCapacity = 0;
      
      // Try all manufacturer BTU mappings
      for (const manufacturer of Object.keys(BTU_MAPPINGS)) {
        if (BTU_MAPPINGS[manufacturer][sizeCode]) {
          btuCapacity = BTU_MAPPINGS[manufacturer][sizeCode];
          break;
        }
      }

      if (btuCapacity > 0) {
        return {
          modelNumber,
          manufacturer: "Unknown",
          confidence: 60,
          systemType: "Straight A/C",
          btuCapacity,
          voltage: "208-230",
          phases: "1",
          specifications: [
            { label: "Refrigerant", value: "R-410A" },
            { label: "Sound Level", value: "75", unit: "dB" }
          ]
        };
      }
    }

    return null;
  }
}