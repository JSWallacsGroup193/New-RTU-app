import type { ParsedModel, ManufacturerPattern as LearnedPattern } from "@shared/schema";
import type { IStorage } from "../storage";

interface ManufacturerPattern {
  name: string;
  patterns: RegExp[];
  parser: (modelNumber: string, match: RegExpMatchArray) => Partial<ParsedModel> | null;
}

interface LearningContext {
  storage?: IStorage;
  enableLearning: boolean;
  sessionId?: string;
}

// Comprehensive voltage detection mappings from JSON schema
interface VoltageMapping {
  [key: string]: {
    voltage: string;
    phases: string;
    frequency: string;
  };
}

const UNIVERSAL_VOLTAGE_MAPPINGS: VoltageMapping = {
  // Standard single-phase voltage codes
  "A": { voltage: "208/230", phases: "1", frequency: "60" },
  "A1": { voltage: "208/230", phases: "1", frequency: "60" },
  "B": { voltage: "208/230", phases: "1", frequency: "60" },
  "B1": { voltage: "208/230", phases: "1", frequency: "60" },
  "C": { voltage: "208/230", phases: "1", frequency: "60" },
  "C1": { voltage: "208/230", phases: "1", frequency: "60" },
  "1": { voltage: "208/230", phases: "1", frequency: "60" },

  // Three-phase 208/230V codes
  "A3": { voltage: "208/230", phases: "3", frequency: "60" },
  "B3": { voltage: "208/230", phases: "3", frequency: "60" },
  "C3": { voltage: "208/230", phases: "3", frequency: "60" },
  "3": { voltage: "208/230", phases: "3", frequency: "60" },

  // High voltage three-phase codes
  "A4": { voltage: "460", phases: "3", frequency: "60" },
  "B4": { voltage: "460", phases: "3", frequency: "60" },
  "C4": { voltage: "460", phases: "3", frequency: "60" },
  "D": { voltage: "460", phases: "3", frequency: "60" },
  "4": { voltage: "460", phases: "3", frequency: "60" },

  // Extra high voltage codes
  "A5": { voltage: "575", phases: "3", frequency: "60" },
  "B5": { voltage: "575", phases: "3", frequency: "60" },
  "C5": { voltage: "575", phases: "3", frequency: "60" },
  "E": { voltage: "575", phases: "3", frequency: "60" },
  "5": { voltage: "575", phases: "3", frequency: "60" },

  // Specialty codes
  "H": { voltage: "208", phases: "3", frequency: "60" },
  "J": { voltage: "230", phases: "1", frequency: "60" },
  "K": { voltage: "200", phases: "3", frequency: "60" },
  "L": { voltage: "380", phases: "3", frequency: "50" },
  "M": { voltage: "415", phases: "3", frequency: "50" }
};

// Multi-criteria confidence scoring system
interface ConfidenceFactors {
  patternMatch: number;    // Base pattern recognition (40%)
  btuCapacity: number;     // BTU capacity identified (25%)
  systemType: number;      // System type identified (20%)
  voltage: number;         // Voltage/phases identified (15%)
}

// Enhanced confidence scoring using Python decoder approach
function calculateConfidence(factors: Partial<ConfidenceFactors>): number {
  // Base scoring like Python decoder: category +1, tonnage +2, voltage +1
  let score = 0;
  
  // Pattern match quality (40% weight)
  if (factors.patternMatch !== undefined) {
    score += (factors.patternMatch / 100) * 4; // Max 4 points
  }
  
  // BTU capacity resolution (25% weight, +2 like Python)
  if (factors.btuCapacity !== undefined && factors.btuCapacity > 0) {
    score += 2;
  }
  
  // System type inference (20% weight, +1 like Python)
  if (factors.systemType !== undefined && factors.systemType > 0) {
    score += 1;
  }
  
  // Voltage detection (15% weight, +1 like Python)
  if (factors.voltage !== undefined && factors.voltage > 0) {
    score += 1;
  }
  
  // Convert to percentage (max possible score is ~8)
  const percentage = Math.min(100, Math.round((score / 8) * 100));
  
  // Ensure minimum confidence for any successful parse (lowered from 60% to reflect uncertainty better)
  return Math.max(45, percentage);
}

// Manufacturer-specific voltage token maps from Python decoder
const MANUFACTURER_VOLTAGE_MAPS = {
  trane: {
    "A1": "208/230", "A3": "460", "A5": "575",
    "D1": "208/230", "D3": "460", "D5": "575",
    "1000": "208/230", "3000": "460", "5000": "575"
  },
  carrier: {
    "A": "208/230", "D": "460", "E": "575",
    "1": "208/230", "3": "460", "5": "575"
  },
  lennox: {
    "230": "208/230", "460": "460", "575": "575",
    "H4": "208/230", "H6": "460", "V1": "208/230", "V3": "460"
  },
  york: {
    "S41": "208/230", "S43": "460", "S45": "575",
    "41": "208/230", "43": "460", "45": "575"
  }
};

// Enhanced voltage detection with multi-strategy approach from Python decoder
function detectVoltageFromCode(code: string, manufacturer?: string, fallbackMaps?: Record<string, any>): { voltage: string; phases: string; code?: string } {
  if (!code) return { voltage: "208/230", phases: "1" };
  
  const upperCode = code.toUpperCase();
  
  // Primary: Universal voltage mapping
  const mapping = UNIVERSAL_VOLTAGE_MAPPINGS[upperCode];
  if (mapping) {
    return { voltage: mapping.voltage, phases: mapping.phases, code: upperCode };
  }
  
  // Secondary: Manufacturer-specific voltage maps
  if (manufacturer) {
    const mfgMap = MANUFACTURER_VOLTAGE_MAPS[manufacturer.toLowerCase() as keyof typeof MANUFACTURER_VOLTAGE_MAPS];
    if (mfgMap && (mfgMap as Record<string, string>)[upperCode]) {
      const voltage = (mfgMap as Record<string, string>)[upperCode];
      const phases = voltage.includes("460") || voltage.includes("575") ? "3" : "1";
      return { voltage, phases, code: upperCode };
    }
  }
  
  // Tertiary: Check fallback maps (manufacturer-specific)
  if (fallbackMaps) {
    for (const mapName in fallbackMaps) {
      const map = fallbackMaps[mapName];
      if (typeof map === 'object' && map[upperCode]) {
        return { voltage: map[upperCode], phases: "1", code: upperCode }; // Default to single phase
      }
    }
  }
  
  // Quaternary: Advanced heuristic voltage detection with suffix patterns
  if (upperCode.includes("230") || upperCode.includes("208")) {
    return { voltage: "208/230", phases: "1", code: upperCode };
  }
  if (upperCode.includes("460")) {
    return { voltage: "460", phases: "3", code: upperCode };
  }
  if (upperCode.includes("575")) {
    return { voltage: "575", phases: "3", code: upperCode };
  }
  
  // Pattern-based voltage detection (e.g., -230, -460, -575 suffixes)
  const voltageMatch = upperCode.match(/(\d{3})$/);
  if (voltageMatch) {
    const voltCode = voltageMatch[1];
    if (voltCode === "230") return { voltage: "208/230", phases: "1", code: upperCode };
    if (voltCode === "460") return { voltage: "460", phases: "3", code: upperCode };
    if (voltCode === "575") return { voltage: "575", phases: "3", code: upperCode };
  }
  
  // Default fallback
  return { voltage: "208/230", phases: "1" };
}

// Smart tonnage derivation algorithm from Python decoder
function smartTonnageFromCode(code: string | null): number | null {
  if (!code) return null;
  
  try {
    // Extract only digits from the code
    const digits = code.replace(/[^0-9]/g, '');
    if (!digits) return null;
    
    const numericValue = parseInt(digits, 10);
    
    // Handle different digit lengths with specific logic
    switch (digits.length) {
      case 2: {
        // 2-digit codes: divide by 12 (e.g., 72 → 6.0 tons)
        return Math.round((numericValue / 12) * 1000) / 1000;
      }
      
      case 3: {
        // 3-digit codes with special handling
        if (digits.endsWith("90")) {
          return 7.5; // 090 → 7.5 tons (exact)
        }
        return Math.round((numericValue / 12) * 1000) / 1000;
      }
      
      case 4:
      case 5:
      case 6: {
        // Treat as BTU values (e.g., 36000 → 3.0 tons)
        return Math.round((numericValue / 12000) * 1000) / 1000;
      }
      
      default:
        return null;
    }
  } catch (error) {
    return null;
  }
}

// Enhanced unit category inference with multiple heuristics
function inferUnitCategory(modelNumber: string, familyCode?: string, typeCode?: string): "Heat Pump" | "Gas/Electric" | "Straight A/C" {
  const upperModel = modelNumber.toUpperCase();
  
  // Family-based detection (most reliable)
  if (familyCode) {
    const upperFamily = familyCode.toUpperCase();
    
    // Heat pump families (TTR removed - TTR is Straight A/C)
    if (upperFamily.includes("HP") || upperFamily.includes("TC") || upperFamily.includes("GSZ") || 
        upperFamily.includes("TWR") || upperFamily.includes("RP") || upperFamily.includes("YHJ") ||
        upperFamily.includes("LSN") || upperFamily.includes("MSZ") || upperFamily.includes("PLA")) {
      return "Heat Pump";
    }
    
    // Gas/Electric families  
    if (upperFamily.includes("HC") || upperFamily.includes("HD") || upperFamily.includes("GPC") || 
        upperFamily.includes("GMT") || upperFamily.includes("GKC") || upperFamily.includes("TUD") ||
        upperFamily.includes("YMG") || upperFamily.includes("STA") || upperFamily.includes("GAS")) {
      return "Gas/Electric";
    }
    
    // Straight A/C families (Added TTR, TTA, TSC)
    if (upperFamily.includes("AC") || upperFamily.includes("GSC") || upperFamily.includes("GSX") || 
        upperFamily.includes("DSX") || upperFamily.includes("TSC") || upperFamily.includes("TTR") || 
        upperFamily.includes("TTA") || upperFamily.includes("YCJ") || upperFamily.includes("YCJF") ||
        upperFamily.includes("LSU") || upperFamily.includes("LSA") || upperFamily.includes("MUZ") ||
        upperFamily.includes("MLZ") || upperFamily.includes("CKC") || upperFamily.includes("FB")) {
      return "Straight A/C";
    }
  }
  
  // Type character heuristics (C=A/C, H=Heat Pump, G=Gas/Electric, D=Dual Fuel)
  if (typeCode) {
    const upperType = typeCode.toUpperCase();
    switch (upperType) {
      case "C": return "Straight A/C";
      case "H": return "Heat Pump";
      case "G": return "Gas/Electric";
      case "D": return "Gas/Electric"; // Dual fuel treated as Gas/Electric
    }
  }
  
  // Model number pattern fallbacks
  if (upperModel.includes("HP") || upperModel.includes("HEATPUMP")) return "Heat Pump";
  if (upperModel.includes("GAS") || upperModel.includes("FURNACE")) return "Gas/Electric";
  
  // Default to straight A/C
  return "Straight A/C";
}

// BTU capacity lookup tables for ALL major HVAC manufacturers
const BTU_MAPPINGS: Record<string, Record<string, number>> = {
  // Carrier/Bryant/Payne/ICP brands sizing codes
  carrier: {
    "012": 12000, "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000, "072": 72000, "090": 90000, "120": 120000,
    "12": 12000, "18": 18000, "24": 24000, "30": 30000, "36": 36000, "42": 42000,
    "48": 48000, "60": 60000, "72": 72000, "90": 90000
  },
  // Trane/American Standard sizing codes  
  trane: {
    "012": 12000, "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000, "072": 72000, "090": 90000, "120": 120000,
    "12": 12000, "18": 18000, "24": 24000, "30": 30000, "36": 36000, "42": 42000,
    "48": 48000, "60": 60000, "72": 72000, "90": 90000
  },
  // York/Coleman/Luxaire sizing codes
  york: {
    "012": 12000, "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000, "072": 72000, "090": 90000, "120": 120000
  },
  // Lennox/Ducane/Armstrong/Allied sizing codes
  lennox: {
    "012": 12000, "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000, "072": 72000, "090": 90000, "120": 120000,
    "12": 12000, "18": 18000, "24": 24000, "30": 30000, "36": 36000, "42": 42000,
    "48": 48000, "60": 60000, "72": 72000, "90": 90000
  },
  // Goodman/Amana/Janitrol sizing codes
  goodman: {
    "012": 12000, "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000, "072": 72000, "090": 90000, "120": 120000,
    "12": 12000, "18": 18000, "24": 24000, "30": 30000, "36": 36000, "42": 42000,
    "48": 48000, "60": 60000, "72": 72000, "90": 90000
  },
  // Rheem/Ruud/Richmond sizing codes
  rheem: {
    "012": 12000, "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000, "072": 72000, "090": 90000, "120": 120000,
    "12": 12000, "18": 18000, "24": 24000, "30": 30000, "36": 36000, "42": 42000,
    "48": 48000, "60": 60000, "72": 72000, "90": 90000
  },
  // Nordyne/Frigidaire/Gibson/Kelvinator sizing codes
  nordyne: {
    "012": 12000, "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000, "072": 72000, "090": 90000, "120": 120000
  },
  // ICP brands (Tempstar, Heil, Comfortmaker, Arcoaire, etc.)
  icp: {
    "012": 12000, "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000, "072": 72000, "090": 90000, "120": 120000,
    "12": 12000, "18": 18000, "24": 24000, "30": 30000, "36": 36000, "42": 42000,
    "48": 48000, "60": 60000, "72": 72000, "90": 90000
  },
  // Maytag/Speed Queen sizing codes  
  maytag: {
    "012": 12000, "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000, "072": 72000, "090": 90000
  },
  // Friedrich/Bosch sizing codes
  friedrich: {
    "012": 12000, "018": 18000, "024": 24000, "030": 30000, "036": 36000, "042": 42000,
    "048": 48000, "060": 60000, "072": 72000, "090": 90000
  },
  // Asian manufacturers (LG, Samsung, Mitsubishi, Fujitsu, Daikin) - minisplit semantics
  asian: {
    "09": 9000, "009": 9000, "12": 12000, "012": 12000, "18": 18000, "018": 18000, 
    "24": 24000, "024": 24000, "30": 30000, "030": 30000, "36": 36000, "036": 36000,
    "42": 42000, "042": 42000, "48": 48000, "048": 48000, "60": 60000, "060": 60000, 
    "72": 72000, "072": 72000, "90": 90000, "090": 90000, 
    // Fixed: 120 is 1 ton (12,000 BTU) in minisplit terminology, not 10 tons
    "120": 12000, "180": 18000, "240": 24000
  },
  // Daikin R-32 commercial package units - uses 3-digit capacity codes
  daikin_r32: {
    "036": 36000, "048": 48000, "060": 60000, "072": 72000, "090": 90000, "102": 102000,
    "120": 120000, "150": 150000, "180": 180000, "240": 240000, "300": 300000
  }
};

const VOLTAGE_MAPPINGS: Record<string, string> = {
  "A": "208-230", "B": "460", "C": "575", "4": "208-230", "5": "460", "6": "575",
  "1": "208-230", "2": "460", "3": "575"
};

const PHASE_MAPPINGS: Record<string, string> = {
  "1": "1", "3": "3", "A": "1", "B": "3"
};

// UNIVERSAL MANUFACTURER PATTERNS - Supporting ALL major HVAC brands
const MANUFACTURER_PATTERNS: ManufacturerPattern[] = [
  // ASIAN MANUFACTURERS - MOVED TO TOP TO AVOID GENERIC PATTERN CONFLICTS
  // LG (Asian manufacturer)
  {
    name: "LG",
    patterns: [
      /^(LSN|LSU|LSA|LFU)([0-9]{2,3})[A-Z0-9]*$/i, // LSN120HV4, LSU120HSV4 - LG specific prefixes
      /^([0-9]{2,3})(LSN|LSU|LSA|LFU)([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[3];
      
      // Try exact mapping first, then fallback to normalized for specific whitelist only
      let btuCapacity = BTU_MAPPINGS.asian[sizeCode];
      
      if (!btuCapacity && sizeCode.length === 3) {
        // Only normalize specific small capacity codes (009/012/015/018/024/030/036)
        const numericCode = parseInt(sizeCode);
        const normalizationWhitelist = [9, 12, 15, 18, 24, 30, 36];
        
        if (normalizationWhitelist.includes(numericCode)) {
          const normalizedSize = String(numericCode).padStart(2, '0');
          btuCapacity = BTU_MAPPINGS.asian[normalizedSize];
        }
      }
      
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("LSU") || modelNumber.includes("LSN") ? "Heat Pump" : "Straight A/C";
      
      return {
        manufacturer: "LG",
        confidence: 88,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "19.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "65", unit: "dB" },
          { label: "Application", value: "Mini-Split" }
        ]
      };
    }
  },
  // MITSUBISHI
  {
    name: "Mitsubishi",
    patterns: [
      /^(MSZ|PLA|MUZ|MLZ)[\-A-Z]*([0-9]{2,3})[A-Z0-9]*$/i, // MSZ-FE12NA, PLA-A12AA4 - Mitsubishi with flexible middle section
      /^([0-9]{2,3})(MSZ|PLA|MUZ|MLZ)([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[3];
      
      // Try exact mapping first, then fallback to normalized for specific whitelist only
      let btuCapacity = BTU_MAPPINGS.asian[sizeCode];
      
      if (!btuCapacity && sizeCode.length === 3) {
        // Only normalize specific small capacity codes (009/012/015/018/024/030/036)
        const numericCode = parseInt(sizeCode);
        const normalizationWhitelist = [9, 12, 15, 18, 24, 30, 36];
        
        if (normalizationWhitelist.includes(numericCode)) {
          const normalizedSize = String(numericCode).padStart(2, '0');
          btuCapacity = BTU_MAPPINGS.asian[normalizedSize];
        }
      }
      
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("MSZ") || modelNumber.includes("PLA") ? "Heat Pump" : "Straight A/C";
      
      return {
        manufacturer: "Mitsubishi",
        confidence: 92,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "22.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "58", unit: "dB" },
          { label: "Application", value: "Mini-Split" }
        ]
      };
    }
  },
  // BRYANT (Carrier subsidiary) - MUST COME BEFORE CARRIER TO AVOID CONFLICTS  
  {
    name: "Bryant",
    patterns: [
      /^([0-9]{2})(CKC|FB|STA|GAS)([0-9]{2,3})[A-Z0-9]*$/i, // 38CKC036, 58STA042 - Bryant specific prefixes
      /^(CKC|FB|STA|GAS)([0-9]{2,3})[A-Z0-9]*$/i // Bryant specific prefixes only, excluding American Standard/Trane prefixes
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[3] || match[2];
      const btuCapacity = BTU_MAPPINGS.carrier[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("CKC") || modelNumber.includes("FB") ? "Heat Pump" :
                        modelNumber.includes("STA") || modelNumber.includes("GAS") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Bryant",
        confidence: 89,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "16.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "72", unit: "dB" },
          { label: "Application", value: "Package Unit" }
        ]
      };
    }
  },
  {
    name: "Carrier",
    patterns: [
      // Enhanced pattern: family + size + voltage code (e.g., 48HC048A1, 50TC036A1)
      /^((?:48|50)[A-Z]{2})([0-9]{3})([A-Z][0-9])$/i,
      // Legacy patterns for compatibility
      /^(50|38)(TC|HD|HV|TQ)([0-9]{2,4})[A-Z0-9]*$/i,
      /^([0-9]{2})(TC|HD|HV|TQ)([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      let sizeCode: string;
      let family: string | undefined;
      let voltageToken: string | undefined;
      
      // Enhanced parsing for new pattern
      if (match[1] && match[2] && match[3] && match[1].match(/^(?:48|50)[A-Z]{2}$/)) {
        family = match[1];
        sizeCode = match[2]; // 3-digit size code like "048"
        voltageToken = match[3];
      } else {
        sizeCode = match[3] || match[2];
      }

      // Enhanced BTU mapping including commercial sizes
      const carrierBTUMapping: Record<string, number> = {
        // Residential package units (handle both 2 and 3 digit formats)
        "24": 24000, "024": 24000, "30": 30000, "030": 30000, 
        "36": 36000, "036": 36000, "48": 48000, "048": 48000, 
        "60": 60000, "060": 60000,
        // Commercial sizes from JSON schema  
        "18": 18000, "018": 18000, "42": 42000, "042": 42000,
        "72": 72000, "072": 72000, "90": 90000, "090": 90000, 
        "120": 120000, "12": 120000, "012": 120000
      };

      // Try enhanced BTU mapping first, then smart tonnage derivation
      let btuCapacity = carrierBTUMapping[sizeCode] || BTU_MAPPINGS.carrier[sizeCode];
      if (!btuCapacity) {
        const smartTonnage = smartTonnageFromCode(sizeCode);
        if (smartTonnage) {
          btuCapacity = smartTonnage * 12000;
        }
      }
      if (!btuCapacity) return null;

      // Enhanced system type detection using smart inference
      const systemType = inferUnitCategory(modelNumber, family);

      // Use universal voltage detection
      const voltageInfo = voltageToken ? detectVoltageFromCode(voltageToken) : { voltage: "208/230", phases: "1" };

      // Calculate confidence using multi-criteria scoring
      const confidence = calculateConfidence({
        patternMatch: family && voltageToken ? 95 : (family ? 85 : 75),
        btuCapacity: btuCapacity ? 90 : 0,
        systemType: systemType !== "Straight A/C" ? 85 : 70,
        voltage: voltageToken ? 90 : 60
      });

      return {
        manufacturer: "Carrier",
        confidence,
        systemType,
        btuCapacity,
        voltage: voltageInfo.voltage,
        phases: voltageInfo.phases,
        specifications: [
          { label: "SEER2 Rating", value: "16.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "72", unit: "dB" },
          { label: "Application", value: "Package Unit" },
          ...(family ? [{ label: "Family", value: family }] : [])
        ]
      };
    }
  },
  // AMERICAN STANDARD (Trane subsidiary) - MUST COME BEFORE TRANE TO AVOID CONFLICTS
  {
    name: "American Standard",
    patterns: [
      /^(TUR|TTD|TUH|TTA)([0-9]{2,3})[A-Z0-9]*$/i, // TUR042C300AA, TTD042C300BA - American Standard specific prefixes
      /^([0-9]{2})(TUR|TTD|TUH|TTA)([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[3];
      const btuCapacity = BTU_MAPPINGS.trane[sizeCode];
      if (!btuCapacity) return null;
      
      // Enhanced system type detection using smart inference
      const systemType = inferUnitCategory(modelNumber);
      
      return {
        manufacturer: "American Standard",
        confidence: 87,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "16.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "71", unit: "dB" }
        ]
      };
    }
  },
  {
    name: "Trane",
    patterns: [
      // Enhanced pattern for family + capacity + voltage (e.g., TWR036A1000AA)
      /^([A-Z]{3,4})([0-9]{2,3})([A-Z][0-9]+)[A-Z]*$/i,
      // Legacy patterns for compatibility
      /^([0-9]{3})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i,
      /^(TWR|TTR|TSC|TTA|TEM)([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      let sizeCode: string;
      let family: string | undefined;
      let voltageToken: string | undefined;
      
      // Enhanced parsing for new pattern
      if (match[1] && match[2] && match[3] && match[1].match(/^[A-Z]{3,4}$/)) {
        family = match[1];
        sizeCode = match[2];
        voltageToken = match[3];
      } else {
        sizeCode = match[2] || match[1];
        // Try to extract family from model number
        const familyMatch = modelNumber.match(/^([A-Z]{3,4})/);
        if (familyMatch) family = familyMatch[1];
      }

      // Try enhanced BTU mapping first, then smart tonnage derivation
      let btuCapacity = BTU_MAPPINGS.trane[sizeCode];
      if (!btuCapacity) {
        const smartTonnage = smartTonnageFromCode(sizeCode);
        if (smartTonnage) {
          btuCapacity = smartTonnage * 12000;
        }
      }
      if (!btuCapacity) return null;

      // Enhanced system type detection using smart inference
      const systemType = inferUnitCategory(modelNumber, family);

      // Use enhanced voltage detection with manufacturer-specific maps
      const voltageInfo = voltageToken ? detectVoltageFromCode(voltageToken, "trane") : { voltage: "208/230", phases: "1" };

      // Calculate confidence using multi-criteria scoring
      const confidence = calculateConfidence({
        patternMatch: family && voltageToken ? 90 : (family ? 80 : 75),
        btuCapacity: btuCapacity ? 85 : 0,
        systemType: systemType !== "Straight A/C" ? 80 : 70,
        voltage: voltageToken ? 85 : 60
      });

      return {
        manufacturer: "Trane",
        confidence,
        systemType,
        btuCapacity,
        voltage: voltageInfo.voltage,
        phases: voltageInfo.phases,
        specifications: [
          { label: "SEER2 Rating", value: "16.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "71", unit: "dB" },
          ...(family ? [{ label: "Family", value: family }] : [])
        ]
      };
    }
  },
  {
    name: "York",
    patterns: [
      // Enhanced pattern for family + capacity + voltage (e.g., YCJF36S41S2)
      /^([A-Z]{3,4})([0-9]{2,3})([A-Z][0-9]+[A-Z0-9]*)$/i,
      // Legacy patterns for compatibility
      /^(YCJ|YHJ|YMG|YCJF|YHJF)([0-9]{2,3})[A-Z0-9]*$/i,
      /^([0-9]{2})(YCJ|YHJ|YMG)([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      let sizeCode: string;
      let family: string | undefined;
      let voltageToken: string | undefined;
      
      // Enhanced parsing for new pattern
      if (match[1] && match[2] && match[3] && match[1].match(/^[A-Z]{3,4}$/)) {
        family = match[1];
        sizeCode = match[2];
        voltageToken = match[3];
      } else {
        sizeCode = match[2] || match[1];
        // Try to extract family from model number
        const familyMatch = modelNumber.match(/^([A-Z]{3,4})/);
        if (familyMatch) family = familyMatch[1];
      }

      // Try enhanced BTU mapping first, then smart tonnage derivation
      let btuCapacity = BTU_MAPPINGS.york[sizeCode];
      if (!btuCapacity) {
        const smartTonnage = smartTonnageFromCode(sizeCode);
        if (smartTonnage) {
          btuCapacity = smartTonnage * 12000;
        }
      }
      if (!btuCapacity) return null;

      // Enhanced system type detection using smart inference
      const systemType = inferUnitCategory(modelNumber, family);

      // Use universal voltage detection
      const voltageInfo = voltageToken ? detectVoltageFromCode(voltageToken) : { voltage: "208/230", phases: "1" };

      // Calculate confidence using multi-criteria scoring
      const confidence = calculateConfidence({
        patternMatch: family && voltageToken ? 85 : (family ? 75 : 70),
        btuCapacity: btuCapacity ? 85 : 0,
        systemType: systemType !== "Straight A/C" ? 80 : 70,
        voltage: voltageToken ? 80 : 55
      });

      return {
        manufacturer: "York",
        confidence,
        systemType,
        btuCapacity,
        voltage: voltageInfo.voltage,
        phases: voltageInfo.phases,
        specifications: [
          { label: "SEER2 Rating", value: "16.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "73", unit: "dB" },
          ...(family ? [{ label: "Family", value: family }] : [])
        ]
      };
    }
  },
  {
    name: "Lennox",
    patterns: [
      // Enhanced pattern for family + series + capacity + voltage (e.g., XP16-036-230, HP21-048-460)
      /^([A-Z]{2,4})([0-9]{2})[\-]([0-9]{2,3})[\-]([0-9]{3})$/i,
      // Legacy patterns for compatibility 
      /^(XP|EL|SL|ML|HS|CH|CBX|ELX|HP)([0-9]{2,3})[A-Z0-9\-]*$/i,
      /^([0-9]{2})(XP|EL|SL|ML|HS|CH|CBX|ELX|HP)([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      let sizeCode: string;
      let family: string | undefined;
      let voltageToken: string | undefined;
      
      // Enhanced parsing for new pattern (family-series-capacity-voltage)
      if (match[1] && match[2] && match[3] && match[4]) {
        family = match[1];
        sizeCode = match[3]; // Capacity is in the 3rd group
        voltageToken = match[4]; // Voltage is in the 4th group
      } else {
        sizeCode = match[2] || match[1];
        // Try to extract family from legacy patterns
        const familyMatch = modelNumber.match(/([A-Z]{2,4})/);
        if (familyMatch) family = familyMatch[1];
      }

      // Try enhanced BTU mapping first, then smart tonnage derivation
      let btuCapacity = BTU_MAPPINGS.lennox[sizeCode];
      if (!btuCapacity) {
        const smartTonnage = smartTonnageFromCode(sizeCode);
        if (smartTonnage) {
          btuCapacity = smartTonnage * 12000;
        }
      }
      if (!btuCapacity) return null;

      // Enhanced system type detection using smart inference
      const systemType = inferUnitCategory(modelNumber, family);

      // Use universal voltage detection
      const voltageInfo = voltageToken ? detectVoltageFromCode(voltageToken) : { voltage: "208/230", phases: "1" };

      // Calculate confidence using multi-criteria scoring
      const confidence = calculateConfidence({
        patternMatch: family && voltageToken ? 88 : (family ? 78 : 72),
        btuCapacity: btuCapacity ? 85 : 0,
        systemType: systemType !== "Straight A/C" ? 80 : 70,
        voltage: voltageToken ? 80 : 55
      });

      return {
        manufacturer: "Lennox",
        confidence,
        systemType,
        btuCapacity,
        voltage: voltageInfo.voltage,
        phases: voltageInfo.phases,
        specifications: [
          { label: "SEER2 Rating", value: "16.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "74", unit: "dB" },
          ...(family ? [{ label: "Family", value: family }] : [])
        ]
      };
    }
  },
  {
    name: "Goodman",
    patterns: [
      // Enhanced pattern for complex models (e.g., GSZ160361A1)
      /^([A-Z]{3,4})([0-9]+)([A-Z][0-9])$/i,
      // Legacy patterns for compatibility
      /^([A-Z]{3,4})([0-9]{2,3})[A-Z0-9]*$/i,
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      let sizeCode: string;
      let familyCode: string | undefined;
      let voltageCode: string | undefined;
      
      // Enhanced parsing for new pattern (GSZ160361A1)
      if (match[1] && match[2] && match[3] && match[2].length >= 4) {
        familyCode = match[1]; // GSZ
        const fullNumber = match[2]; // 160361
        voltageCode = match[3]; // A1
        
        // Extract size from full number - look for embedded tonnage patterns
        const sizeMatch = fullNumber.match(/(0?(18|24|30|36|42|48|60|72|90))/);
        sizeCode = sizeMatch ? sizeMatch[2] : fullNumber.substring(fullNumber.length - 2);
      } else {
        familyCode = match[1];
        sizeCode = match[2] || match[1];
      }
      
      // Enhanced size code handling from JSON schema
      if (sizeCode && sizeCode.length >= 4) {
        // Handle formats like "160361" -> "36", "144808" -> "48"
        const extractedSize = sizeCode.substring(2, 4);
        if (["18", "24", "30", "36", "42", "48", "60"].includes(extractedSize)) {
          sizeCode = extractedSize;
        } else if (sizeCode.length === 6) {
          // Try first two digits for commercial units
          const commercialSize = sizeCode.substring(0, 2);
          if (["07", "08", "09", "10", "12", "14", "15", "16", "20"].includes(commercialSize)) {
            sizeCode = commercialSize;
          } else {
            sizeCode = sizeCode.substring(0, 2);
          }
        }
      }
      
      // Enhanced BTU mapping including commercial sizes
      const goodmanBTUMapping: Record<string, number> = {
        // Residential units
        "18": 18000, "24": 24000, "30": 30000, "36": 36000, "42": 42000, "48": 48000, "60": 60000,
        // Commercial units from JSON schema
        "07": 90000, "08": 96000, "09": 102000, "10": 120000, "12": 144000, 
        "14": 168000, "15": 180000, "16": 192000, "20": 240000,
        // Legacy mappings
        "072": 72000, "090": 90000, "120": 120000
      };

      // Try enhanced BTU mapping first, then smart tonnage derivation  
      let btuCapacity = goodmanBTUMapping[sizeCode] || BTU_MAPPINGS.goodman[sizeCode];
      if (!btuCapacity) {
        const smartTonnage = smartTonnageFromCode(sizeCode);
        if (smartTonnage) {
          btuCapacity = smartTonnage * 12000;
        }
      }
      if (!btuCapacity) return null;

      // Enhanced system type detection using smart inference
      const systemType = inferUnitCategory(modelNumber, familyCode);

      // Use universal voltage detection
      const voltageInfo = voltageCode ? detectVoltageFromCode(voltageCode) : { voltage: "208/230", phases: "1" };

      // Calculate confidence using multi-criteria scoring
      const confidence = calculateConfidence({
        patternMatch: familyCode && voltageCode ? 90 : (familyCode ? 80 : 70),
        btuCapacity: btuCapacity ? 85 : 0,
        systemType: systemType !== "Straight A/C" ? 80 : 65,
        voltage: voltageCode ? 85 : 60
      });

      return {
        manufacturer: "Goodman",
        confidence,
        systemType,
        btuCapacity,
        voltage: voltageInfo.voltage,
        phases: voltageInfo.phases,
        specifications: [
          { label: "SEER2 Rating", value: "15.5" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "74", unit: "dB" },
          ...(familyCode ? [{ label: "Family", value: familyCode }] : [])
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
          { label: "SEER2 Rating", value: "16.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "73", unit: "dB" }
        ]
      };
    }
  },
  // PAYNE (Carrier subsidiary)
  {
    name: "Payne",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // PA13NA036, PH13NB048
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.carrier[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("PH") || modelNumber.includes("PA") ? "Heat Pump" :
                        modelNumber.includes("PG") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Payne",
        confidence: 83,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "14.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "74", unit: "dB" }
        ]
      };
    }
  },
  // RUUD (Rheem subsidiary)
  {
    name: "Ruud",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // RA1448AJ1NA, UP1448BJ1NA
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.rheem[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("UP") || modelNumber.includes("RP") ? "Heat Pump" :
                        modelNumber.includes("RGR") || modelNumber.includes("UGR") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Ruud",
        confidence: 90,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "16.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "73", unit: "dB" }
        ]
      };
    }
  },
  // AMANA (Goodman subsidiary)  
  {
    name: "Amana",
    patterns: [
      /^([A-Z]{3,4})([0-9]{2,3})[A-Z0-9]*$/i, // ASZ160361, ASXC180361
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.goodman[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("ASZ") || modelNumber.includes("ASX") ? "Heat Pump" :
                        modelNumber.includes("AME") || modelNumber.includes("AGM") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Amana",
        confidence: 79,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230", 
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "14.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "75", unit: "dB" }
        ]
      };
    }
  },
  // TEMPSTAR (ICP brand)
  {
    name: "Tempstar",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // TCH048AKA, TSA048AKA
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.icp[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("TCH") || modelNumber.includes("TSA") ? "Heat Pump" :
                        modelNumber.includes("TGA") || modelNumber.includes("TGM") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Tempstar", 
        confidence: 81,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "14.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "74", unit: "dB" }
        ]
      };
    }
  },
  // HEIL (ICP brand)
  {
    name: "Heil",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // HCH048AKA, HSA048AKA
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.icp[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("HCH") || modelNumber.includes("HSA") ? "Heat Pump" :
                        modelNumber.includes("HGA") || modelNumber.includes("HGM") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Heil",
        confidence: 82,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "14.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "74", unit: "dB" }
        ]
      };
    }
  },
  // COMFORTMAKER (ICP brand)
  {
    name: "Comfortmaker",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // CCH048AKA, CSA048AKA
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.icp[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("CCH") || modelNumber.includes("CSA") ? "Heat Pump" :
                        modelNumber.includes("CGA") || modelNumber.includes("CGM") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Comfortmaker",
        confidence: 80,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "14.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "75", unit: "dB" }
        ]
      };
    }
  },
  // ARCOAIRE (ICP brand)
  {
    name: "Arcoaire",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // ACH048AKA, ASA048AKA
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.icp[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("ACH") || modelNumber.includes("ASA") ? "Heat Pump" :
                        modelNumber.includes("AGA") || modelNumber.includes("AGM") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Arcoaire",
        confidence: 80,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "14.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "75", unit: "dB" }
        ]
      };
    }
  },
  // DAY & NIGHT (ICP brand)
  {
    name: "Day & Night",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // DCH048AKA, DSA048AKA
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.icp[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("DCH") || modelNumber.includes("DSA") ? "Heat Pump" :
                        modelNumber.includes("DGA") || modelNumber.includes("DGM") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Day & Night",
        confidence: 79,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "14.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "75", unit: "dB" }
        ]
      };
    }
  },
  // NORDYNE/FRIGIDAIRE
  {
    name: "Nordyne",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // FS6BD036K, FR6BQ048K
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.nordyne[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("FS") || modelNumber.includes("FR") ? "Heat Pump" :
                        modelNumber.includes("FG") || modelNumber.includes("GM") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Nordyne",
        confidence: 76,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "13.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "76", unit: "dB" }
        ]
      };
    }
  },
  // FRIGIDAIRE  
  {
    name: "Frigidaire",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // FRA036CV1, FRS048CV1
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.nordyne[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("FRS") || modelNumber.includes("FRH") ? "Heat Pump" :
                        modelNumber.includes("FRG") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Frigidaire",
        confidence: 77,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "13.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "76", unit: "dB" }
        ]
      };
    }
  },
  // DUCANE (Lennox subsidiary)
  {
    name: "Ducane",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // 2HP13-036, 2AC13-048
      /^([0-9]{1,2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.lennox[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("HP") || modelNumber.includes("2HP") ? "Heat Pump" :
                        modelNumber.includes("GM") || modelNumber.includes("2GM") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Ducane",
        confidence: 84,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "15.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "74", unit: "dB" }
        ]
      };
    }
  },
  // ARMSTRONG AIR (Lennox subsidiary)
  {
    name: "Armstrong Air",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // 4HP16L36P, 4AC16L48P
      /^([0-9]{1,2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.lennox[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("HP") || modelNumber.includes("4HP") ? "Heat Pump" :
                        modelNumber.includes("GM") || modelNumber.includes("4GM") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Armstrong Air",
        confidence: 85,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "16.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "73", unit: "dB" }
        ]
      };
    }
  },
  // MAYTAG
  {
    name: "Maytag",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // PSH1BGF036, MAC1200ACB
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.maytag[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("PSH") || modelNumber.includes("MAH") ? "Heat Pump" :
                        modelNumber.includes("MAG") || modelNumber.includes("PSG") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Maytag",
        confidence: 75,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "13.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "76", unit: "dB" }
        ]
      };
    }
  },
  // LG (Asian manufacturer)
  {
    name: "LG",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // LSN120HV4, LSU120HSV4
      /^([0-9]{2,3})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.asian[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("LSU") || modelNumber.includes("LSN") ? "Heat Pump" : "Straight A/C";
      
      return {
        manufacturer: "LG",
        confidence: 88,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "19.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "65", unit: "dB" }
        ]
      };
    }
  },
  // MITSUBISHI
  {
    name: "Mitsubishi",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // MSZ-FE12NA, PLA-A12AA4
      /^([0-9]{2,3})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.asian[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("MSZ") || modelNumber.includes("PLA") ? "Heat Pump" : "Straight A/C";
      
      return {
        manufacturer: "Mitsubishi",
        confidence: 92,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "22.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "58", unit: "dB" }
        ]
      };
    }
  },
  // DAIKIN R-32 PACKAGE UNITS (Commercial) - 24-Position Nomenclature
  {
    name: "Daikin",
    patterns: [
      // Daikin R-32 24-position nomenclature: DHG036D1DXXXCAXAXADXXXXXXX based on official spec sheets
      // Position: D(1) H(2) G(3) 036(4-6) 1(7) D(8) XXX(9-11) C(12) A(13) A(14) X(15-24)
      /^D([SH])([CGH])([0-9]{3})([1347])([DLW])[A-Z0-9]{15}$/i,
      // Legacy patterns for older Daikin models  
      /^(DX|DZ)([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      // Check if this is a legacy pattern (DX/DZ)
      if (match[1] && ["DX", "DZ"].includes(match[1].toUpperCase())) {
        const seriesPrefix = match[1];
        const sizeCode = match[2];
        const btuCapacity = BTU_MAPPINGS.asian[sizeCode];
        if (!btuCapacity) return null;
        
        const systemType = seriesPrefix.toUpperCase() === "DZ" ? "Heat Pump" : "Straight A/C";
        
        return {
          manufacturer: "Daikin",
          confidence: 85,
          systemType: systemType as any,
          btuCapacity,
          voltage: "208-230",
          phases: "1",
          specifications: [
            { label: "SEER2 Rating", value: "20.0" },
            { label: "Refrigerant", value: "R-410A" },
            { label: "Sound Level", value: "62", unit: "dB" },
            { label: "Series", value: seriesPrefix.toUpperCase() },
            { label: "Application", value: "Legacy Package Unit" }
          ]
        };
      }
      
      // R-32 24-position nomenclature parsing
      const efficiencyCode = match[1]; // Position 2: S=Standard, H=High Efficiency
      const applicationCode = match[2]; // Position 3: C=Cooling, G=Gas, H=Heat Pump
      const capacityCode = match[3]; // Positions 4-6: 036, 048, 060, etc.
      const voltageCode = match[4]; // Position 7: 1,3,4,7 for voltage/phase combinations
      const fanDriveCode = match[5]; // Position 8: D=Direct Standard, L=Medium, W=High Static
      
      // Lookup BTU capacity using official Daikin R-32 mapping
      const btuCapacity = BTU_MAPPINGS.daikin_r32[capacityCode];
      if (!btuCapacity) return null;
      
      // Determine system type from application code (position 3)
      let systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
      switch (applicationCode.toUpperCase()) {
        case "H":
          systemType = "Heat Pump";
          break;
        case "G":
          systemType = "Gas/Electric";
          break;
        case "C":
          systemType = "Straight A/C";
          break;
        default:
          systemType = "Straight A/C";
      }
      
      // Map voltage code (position 7) to actual voltage/phase combinations per spec sheets
      const voltagePhaseMap: Record<string, { voltage: string; phases: string }> = {
        "1": { voltage: "208-230", phases: "1" },  // 208-230/1/60
        "3": { voltage: "208-230", phases: "3" },  // 208-230/3/60  
        "4": { voltage: "460", phases: "3" },      // 460/3/60
        "7": { voltage: "575", phases: "3" }       // 575/3/60
      };
      
      const { voltage, phases } = voltagePhaseMap[voltageCode] || { voltage: "208-230", phases: "1" };
      
      // Determine efficiency tier and specifications
      const isHighEfficiency = efficiencyCode.toUpperCase() === "H";
      const seriesPrefix = `D${efficiencyCode.toUpperCase()}${applicationCode.toUpperCase()}`;
      
      // Enhanced specifications based on official spec sheets
      const seerRating = isHighEfficiency ? "16.7" : "14.0";
      const eerRating = isHighEfficiency ? "12.5" : "12.0";
      const ieerRating = isHighEfficiency ? "18.6" : "16.7";
      
      // Fan drive type description
      const fanDriveMap: Record<string, string> = {
        "D": "Direct Drive - Standard Static",
        "L": "Direct Drive - Medium Static", 
        "W": "Direct Drive - High Static"
      };
      const fanDriveType = fanDriveMap[fanDriveCode.toUpperCase()] || "Direct Drive";
      
      return {
        manufacturer: "Daikin",
        confidence: 98,
        systemType: systemType as any,
        btuCapacity,
        voltage,
        phases,
        specifications: [
          { label: "SEER2 Rating", value: seerRating },
          { label: "EER2 Rating", value: eerRating },
          { label: "IEER Rating", value: ieerRating },
          { label: "Refrigerant", value: "R-32" },
          { label: "Sound Level", value: "70", unit: "dB" },
          { label: "Drive Type", value: fanDriveType },
          { label: "Efficiency Tier", value: isHighEfficiency ? "High Efficiency" : "Standard Efficiency" },
          { label: "Series", value: seriesPrefix },
          { label: "Application", value: "R-32 Package Unit" }
        ]
      };
    }
  },
  // COLEMAN
  {
    name: "Coleman",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // TC3A036AKA, CJ036AKA
      /^([0-9]{2})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.york[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("TC") || modelNumber.includes("CJ") ? "Heat Pump" :
                        modelNumber.includes("TG") || modelNumber.includes("CG") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "Coleman",
        confidence: 78,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER2 Rating", value: "15.0" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "74", unit: "dB" }
        ]
      };
    }
  }
];

export class HVACModelParser {
  private learningContext: LearningContext;
  private learnedPatternsCache: Map<string, LearnedPattern[]>;
  private lastCacheUpdate: Date;
  private cacheExpiryMinutes = 30; // Cache learned patterns for 30 minutes

  constructor(learningContext: LearningContext = { enableLearning: false }) {
    this.learningContext = learningContext;
    this.learnedPatternsCache = new Map();
    this.lastCacheUpdate = new Date(0); // Force initial cache load
  }

  public async parseModelNumber(modelNumber: string): Promise<ParsedModel | null> {
    const cleanModel = modelNumber.trim().toUpperCase();
    
    // Try learned patterns first if learning is enabled
    if (this.learningContext.enableLearning && this.learningContext.storage) {
      const learnedResult = await this.tryLearnedPatterns(cleanModel);
      if (learnedResult) {
        // Record successful pattern usage
        await this.recordPatternUsage(learnedResult.patternId, true);
        return learnedResult.parsedModel;
      }
    }
    
    // Try built-in patterns
    const builtInResult = this.tryBuiltInPatterns(cleanModel);
    if (builtInResult) {
      return builtInResult;
    }

    // Fallback generic parsing attempt
    const genericResult = this.attemptGenericParsing(cleanModel);
    
    // If learning is enabled and we got a generic result, check for user corrections
    if (genericResult && this.learningContext.enableLearning && this.learningContext.storage) {
      const correctedResult = await this.applyUserCorrections(cleanModel, genericResult);
      if (correctedResult) {
        return correctedResult;
      }
    }
    
    return genericResult;
  }

  /**
   * Parse model number (synchronous version for backward compatibility)
   */
  public parseModelNumberSync(modelNumber: string): ParsedModel | null {
    const cleanModel = modelNumber.trim().toUpperCase();
    return this.tryBuiltInPatterns(cleanModel) || this.attemptGenericParsing(cleanModel);
  }

  /**
   * Enhanced parsing with learning capabilities
   */
  public async parseModelNumberWithLearning(modelNumber: string): Promise<ParsedModel | null> {
    return this.parseModelNumber(modelNumber);
  }

  /**
   * Try learned patterns from the database
   */
  private async tryLearnedPatterns(modelNumber: string): Promise<{
    parsedModel: ParsedModel;
    patternId: string;
  } | null> {
    if (!this.learningContext.storage) return null;

    // Update cache if needed
    await this.updateLearnedPatternsCache();

    // Try to identify manufacturer first to filter patterns
    const possibleManufacturer = this.guessManufacturer(modelNumber);
    
    // Get all learned patterns or manufacturer-specific ones
    const patterns = possibleManufacturer 
      ? this.learnedPatternsCache.get(possibleManufacturer) || []
      : Array.from(this.learnedPatternsCache.values()).flat();

    // Sort patterns by confidence and priority
    const sortedPatterns = patterns
      .filter(p => p.isActive)
      .sort((a, b) => {
        const confidenceDiff = (b.confidence || 0) - (a.confidence || 0);
        if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff;
        return (b.priority || 100) - (a.priority || 100);
      });

    for (const pattern of sortedPatterns) {
      try {
        const regex = new RegExp(pattern.regexPattern, 'i');
        const match = modelNumber.match(regex);
        
        if (match) {
          const parsed = this.applyLearnedPatternExtraction(modelNumber, match, pattern);
          if (parsed) {
            return {
              parsedModel: {
                modelNumber,
                manufacturer: pattern.manufacturer,
                confidence: Math.min(95, (pattern.confidence || 50) + 20), // Boost confidence for learned patterns
                systemType: parsed.systemType || "Straight A/C",
                btuCapacity: parsed.btuCapacity || 0,
                voltage: parsed.voltage || "208-230",
                phases: parsed.phases || "1",
                specifications: parsed.specifications || [
                  { label: "Source", value: "Learned Pattern", unit: "" },
                  { label: "Pattern Confidence", value: (pattern.confidence || 0).toFixed(1), unit: "%" }
                ]
              },
              patternId: pattern.id
            };
          }
        }
      } catch (error) {
        console.warn(`Invalid learned pattern regex: ${pattern.regexPattern}`, error);
        // Flag pattern for review
        if (this.learningContext.storage) {
          await this.learningContext.storage.flagPatternForReview(
            pattern.id, 
            `Invalid regex pattern: ${error}`
          );
        }
      }
    }

    return null;
  }

  /**
   * Try built-in manufacturer patterns with multi-pattern ranking (decode_best approach from Python decoder)
   */
  private tryBuiltInPatterns(modelNumber: string): ParsedModel | null {
    const candidates: Array<{ result: ParsedModel; confidence: number; manufacturer: string }> = [];
    
    // Collect ALL matching patterns instead of returning the first one
    for (const manufacturerPattern of MANUFACTURER_PATTERNS) {
      for (const pattern of manufacturerPattern.patterns) {
        const match = modelNumber.match(pattern);
        if (match) {
          try {
            const parsed = manufacturerPattern.parser(modelNumber, match);
            if (parsed) {
              const result: ParsedModel = {
                modelNumber,
                manufacturer: manufacturerPattern.name,
                confidence: parsed.confidence || 80,
                systemType: parsed.systemType || "Straight A/C",
                btuCapacity: parsed.btuCapacity || 0,
                voltage: parsed.voltage || "208-230",
                phases: parsed.phases || "1",
                specifications: parsed.specifications || []
              };
              
              candidates.push({ 
                result, 
                confidence: result.confidence, 
                manufacturer: manufacturerPattern.name 
              });
            }
          } catch (error) {
            console.error(`Error parsing model ${modelNumber} with pattern ${manufacturerPattern.name}:`, error);
            continue;
          }
        }
      }
    }
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Sort by confidence score (highest first) - Python decoder approach
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    // Return the highest confidence result
    return candidates[0].result;
  }

  /**
   * Apply user corrections to improve parsing accuracy
   */
  private async applyUserCorrections(
    modelNumber: string, 
    originalResult: ParsedModel
  ): Promise<ParsedModel | null> {
    if (!this.learningContext.storage) return null;

    try {
      const corrections = await this.learningContext.storage.getUserCorrectionsByModelNumber(modelNumber);
      
      if (corrections.length === 0) return null;

      // Find the most recent high-confidence correction
      const bestCorrection = corrections
        .filter(c => (c.confidence || 0) > 0.7)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

      if (bestCorrection) {
        const correctedData = bestCorrection.correctedParsedData as ParsedModel;
        
        return {
          ...originalResult,
          ...correctedData,
          confidence: Math.min(90, originalResult.confidence + 15), // Boost confidence for corrected data
          specifications: [
            ...(originalResult.specifications || []),
            { label: "Source", value: "User Correction", unit: "" },
            { label: "Correction Confidence", value: (bestCorrection.confidence || 0).toFixed(1), unit: "%" }
          ]
        };
      }
    } catch (error) {
      console.error("Error applying user corrections:", error);
    }

    return null;
  }

  /**
   * Update the learned patterns cache
   */
  private async updateLearnedPatternsCache(): Promise<void> {
    if (!this.learningContext.storage) return;

    const now = new Date();
    const cacheAge = now.getTime() - this.lastCacheUpdate.getTime();
    const cacheExpiryMs = this.cacheExpiryMinutes * 60 * 1000;

    if (cacheAge < cacheExpiryMs && this.learnedPatternsCache.size > 0) {
      return; // Cache is still valid
    }

    try {
      const allPatterns = await this.learningContext.storage.getManufacturerPatterns();
      
      // Clear and rebuild cache
      this.learnedPatternsCache.clear();
      
      allPatterns.forEach(pattern => {
        const manufacturer = pattern.manufacturer;
        const existing = this.learnedPatternsCache.get(manufacturer) || [];
        existing.push(pattern);
        this.learnedPatternsCache.set(manufacturer, existing);
      });

      this.lastCacheUpdate = now;
    } catch (error) {
      console.error("Error updating learned patterns cache:", error);
    }
  }

  /**
   * Apply learned pattern extraction rules
   */
  private applyLearnedPatternExtraction(
    modelNumber: string,
    match: RegExpMatchArray,
    pattern: LearnedPattern
  ): Partial<ParsedModel> | null {
    try {
      const extractionRules = pattern.extractionRules as any;
      const result: Partial<ParsedModel> = {};

      // Extract capacity
      if (extractionRules.capacityExtraction) {
        const capacity = this.extractCapacity(modelNumber, match, extractionRules.capacityExtraction);
        if (capacity) result.btuCapacity = capacity;
      }

      // Extract system type
      if (extractionRules.systemTypeExtraction) {
        const systemType = this.extractSystemType(modelNumber, extractionRules.systemTypeExtraction);
        if (systemType) result.systemType = systemType;
      }

      // Extract voltage
      if (extractionRules.voltageExtraction) {
        const voltage = this.extractVoltage(modelNumber, match, extractionRules.voltageExtraction);
        if (voltage) result.voltage = voltage;
      }

      // Extract phases
      if (extractionRules.phaseExtraction) {
        const phases = this.extractPhases(modelNumber, match, extractionRules.phaseExtraction);
        if (phases) result.phases = phases;
      }

      // Add manufacturer if specified
      if (extractionRules.manufacturerExtraction) {
        result.manufacturer = extractionRules.manufacturerExtraction.value || pattern.manufacturer;
      }

      return Object.keys(result).length > 0 ? result : null;
    } catch (error) {
      console.error("Error applying learned pattern extraction:", error);
      return null;
    }
  }

  /**
   * Extract capacity using learned rules
   */
  private extractCapacity(
    modelNumber: string, 
    match: RegExpMatchArray, 
    rules: any
  ): number | null {
    if (rules.method === "regex_group" && rules.pattern) {
      const capacityMatch = modelNumber.match(new RegExp(rules.pattern));
      if (capacityMatch && capacityMatch[1]) {
        const sizeCode = capacityMatch[1];
        
        if (rules.transform === "btu_lookup") {
          // Try all BTU mappings
          for (const manufacturer of Object.keys(BTU_MAPPINGS)) {
            if (BTU_MAPPINGS[manufacturer][sizeCode]) {
              return BTU_MAPPINGS[manufacturer][sizeCode];
            }
          }
        }
        
        // Direct numeric conversion
        const numericValue = parseInt(sizeCode);
        if (numericValue > 0) {
          return numericValue < 100 ? numericValue * 12000 : numericValue * 100;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract system type using learned rules
   */
  private extractSystemType(modelNumber: string, rules: any): "Heat Pump" | "Gas/Electric" | "Straight A/C" | null {
    if (rules.method === "pattern_match" && rules.patterns) {
      const upperModel = modelNumber.toUpperCase();
      
      for (const [pattern, systemType] of Object.entries(rules.patterns)) {
        if (upperModel.includes(pattern)) {
          const validatedType = systemType as string;
          // Validate it's a proper system type
          if (validatedType === "Heat Pump" || validatedType === "Gas/Electric" || validatedType === "Straight A/C") {
            return validatedType;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Extract voltage using learned rules
   */
  private extractVoltage(
    modelNumber: string, 
    match: RegExpMatchArray, 
    rules: any
  ): string | null {
    if (rules.method === "mapping" && rules.mappings) {
      for (const [pattern, voltage] of Object.entries(rules.mappings)) {
        if (modelNumber.includes(pattern)) {
          return voltage as string;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract phases using learned rules
   */
  private extractPhases(
    modelNumber: string, 
    match: RegExpMatchArray, 
    rules: any
  ): string | null {
    if (rules.method === "mapping" && rules.mappings) {
      for (const [pattern, phases] of Object.entries(rules.mappings)) {
        if (modelNumber.includes(pattern)) {
          return phases as string;
        }
      }
    }
    
    return null;
  }

  /**
   * Guess manufacturer from model number
   */
  private guessManufacturer(modelNumber: string): string | null {
    const upperModel = modelNumber.toUpperCase();
    
    // Simple heuristics to guess manufacturer
    if (upperModel.includes("CARRIER") || upperModel.startsWith("25")) return "Carrier";
    if (upperModel.includes("TRANE") || upperModel.includes("TWE")) return "Trane";
    if (upperModel.includes("YORK") || upperModel.includes("YCJ")) return "York";
    if (upperModel.includes("LENNOX") || upperModel.includes("EL")) return "Lennox";
    if (upperModel.includes("GOODMAN") || upperModel.includes("GMS")) return "Goodman";
    if (upperModel.includes("RHEEM") || upperModel.includes("RUUD")) return "Rheem";
    if (upperModel.includes("DAIKIN") || upperModel.includes("DX")) return "Daikin";
    if (upperModel.includes("LG") || upperModel.includes("LSN")) return "LG";
    if (upperModel.includes("MITSUBISHI") || upperModel.includes("MSZ")) return "Mitsubishi";
    
    return null;
  }

  /**
   * Record pattern usage for learning analytics
   */
  private async recordPatternUsage(patternId: string, success: boolean): Promise<void> {
    if (!this.learningContext.storage) return;

    try {
      await this.learningContext.storage.incrementPatternMatchCount(patternId, success);
    } catch (error) {
      console.error("Error recording pattern usage:", error);
    }
  }

  /**
   * Get parsing confidence for a model number
   */
  public async getParsingConfidence(modelNumber: string): Promise<number> {
    const result = await this.parseModelNumber(modelNumber);
    return result?.confidence || 0;
  }

  /**
   * Check if a model number has user corrections
   */
  public async hasUserCorrections(modelNumber: string): Promise<boolean> {
    if (!this.learningContext.storage) return false;

    try {
      const corrections = await this.learningContext.storage.getUserCorrectionsByModelNumber(modelNumber);
      return corrections.length > 0;
    } catch (error) {
      console.error("Error checking user corrections:", error);
      return false;
    }
  }

  /**
   * Get learning insights for this parser instance
   */
  public async getLearningInsights(): Promise<{
    totalLearnedPatterns: number;
    cacheHitRate: number;
    topManufacturers: string[];
  }> {
    await this.updateLearnedPatternsCache();
    
    const totalPatterns = Array.from(this.learnedPatternsCache.values())
      .reduce((sum, patterns) => sum + patterns.length, 0);
    
    const manufacturers = Array.from(this.learnedPatternsCache.keys())
      .sort((a, b) => {
        const aPatternsCount = this.learnedPatternsCache.get(a)?.length || 0;
        const bPatternsCount = this.learnedPatternsCache.get(b)?.length || 0;
        return bPatternsCount - aPatternsCount;
      });

    return {
      totalLearnedPatterns: totalPatterns,
      cacheHitRate: 0.85, // Placeholder - would track actual cache hits
      topManufacturers: manufacturers.slice(0, 5)
    };
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