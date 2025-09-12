import type { ParsedModel } from "@shared/schema";

interface ManufacturerPattern {
  name: string;
  patterns: RegExp[];
  parser: (modelNumber: string, match: RegExpMatchArray) => Partial<ParsedModel> | null;
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
    "72": 72000, "072": 72000, "90": 9000, "090": 9000, "120": 12000, "180": 18000, "240": 24000
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
      // Normalize 3-digit Asian codes to 2-digit for proper BTU mapping
      const normalizedSize = sizeCode.length === 3 && parseInt(sizeCode) <= 240 ? 
                            String(parseInt(sizeCode) / 10).padStart(2, '0') : sizeCode;
      const btuCapacity = BTU_MAPPINGS.asian[normalizedSize] || BTU_MAPPINGS.asian[sizeCode];
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
          { label: "SEER Rating", value: "19" },
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
      /^(MSZ|PLA|MUZ|MLZ)[\-A-Z]*([0-9]{2,3})[A-Z0-9]*$/i, // MSZ-FE12NA, PLA-A12AA4 - Mitsubishi with flexible middle section
      /^([0-9]{2,3})(MSZ|PLA|MUZ|MLZ)([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[3];
      // Normalize 3-digit Asian codes to 2-digit for proper BTU mapping
      const normalizedSize = sizeCode.length === 3 && parseInt(sizeCode) <= 240 ? 
                            String(parseInt(sizeCode) / 10).padStart(2, '0') : sizeCode;
      const btuCapacity = BTU_MAPPINGS.asian[normalizedSize] || BTU_MAPPINGS.asian[sizeCode];
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
          { label: "SEER Rating", value: "22" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "58", unit: "dB" }
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
          { label: "SEER Rating", value: "16" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "72", unit: "dB" }
        ]
      };
    }
  },
  {
    name: "Carrier",
    patterns: [
      /^(50|38)(TC|HD|HV|TQ)([0-9]{2,4})[A-Z0-9]*$/i, // 50TCQA04, 38HDR048 - Carrier specific prefixes
      /^([0-9]{2})(TC|HD|HV|TQ)([0-9]{2,3})[A-Z0-9]*$/i // Carrier patterns excluding Bryant prefixes
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[3] || match[2];
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
      
      const systemType = modelNumber.includes("TTR") || modelNumber.includes("TUR") ? "Heat Pump" :
                        modelNumber.includes("TUD") || modelNumber.includes("TTD") ? "Gas/Electric" : "Straight A/C";
      
      return {
        manufacturer: "American Standard",
        confidence: 87,
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
    name: "Trane",
    patterns: [
      /^([0-9]{3})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i, // 4TTR6036, 2TWR2036
      /^(TWR|TTR|TSC|TTA|TEM)([0-9]{2,3})[A-Z0-9]*$/i // TWR036A1000AA - Trane specific prefixes, not TUR/TTD
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
      /^(YCJ|YHJ|YMG|YCJF|YHJF)([0-9]{2,3})[A-Z0-9]*$/i, // YCJF36S41S2, YHJF48S41S3 - York specific prefixes only
      /^([0-9]{2})(YCJ|YHJ|YMG)([0-9]{2,3})[A-Z0-9]*$/i // York specific prefixes only
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
      /^(XP|EL|SL|ML|HS|CH|CBX|ELX|HP)([0-9]{2,3})[A-Z0-9\-]*$/i, // XP16-036-230, HP21-048-230 - Lennox specific prefixes
      /^([0-9]{2})(XP|EL|SL|ML|HS|CH|CBX|ELX|HP)([0-9]{2,3})[A-Z0-9]*$/i
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
          { label: "SEER Rating", value: "14" },
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
          { label: "SEER Rating", value: "16" },
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
          { label: "SEER Rating", value: "14" },
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
          { label: "SEER Rating", value: "14" },
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
          { label: "SEER Rating", value: "14" },
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
          { label: "SEER Rating", value: "14" },
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
          { label: "SEER Rating", value: "14" },
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
          { label: "SEER Rating", value: "14" },
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
          { label: "SEER Rating", value: "13" },
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
          { label: "SEER Rating", value: "13" },
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
          { label: "SEER Rating", value: "15" },
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
          { label: "SEER Rating", value: "16" },
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
          { label: "SEER Rating", value: "13" },
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
          { label: "SEER Rating", value: "19" },
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
          { label: "SEER Rating", value: "22" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "58", unit: "dB" }
        ]
      };
    }
  },
  // DAIKIN (for cross-reference)
  {
    name: "Daikin",
    patterns: [
      /^([A-Z]{2,4})([0-9]{2,3})[A-Z0-9]*$/i, // DX16SA0361, DZ16SA0481
      /^([0-9]{2,3})[A-Z]{2,4}([0-9]{2,3})[A-Z0-9]*$/i
    ],
    parser: (modelNumber, match) => {
      const sizeCode = match[2] || match[1];
      const btuCapacity = BTU_MAPPINGS.asian[sizeCode];
      if (!btuCapacity) return null;
      
      const systemType = modelNumber.includes("DZ") || modelNumber.includes("DX") ? "Heat Pump" : "Straight A/C";
      
      return {
        manufacturer: "Daikin",
        confidence: 95,
        systemType: systemType as any,
        btuCapacity,
        voltage: "208-230",
        phases: "1",
        specifications: [
          { label: "SEER Rating", value: "20" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "62", unit: "dB" }
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
          { label: "SEER Rating", value: "15" },
          { label: "Refrigerant", value: "R-410A" },
          { label: "Sound Level", value: "74", unit: "dB" }
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