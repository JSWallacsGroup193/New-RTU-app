import { 
  type DaikinUnitSpec, 
  type DaikinFamily,
  type NominalTonnages,
  factoryInstalledOptionSchema,
  fieldAccessorySchema,
  systemTypeEnum,
  tonnageEnum,
  voltageEnum,
  phaseEnum,
  efficiencyEnum,
  refrigerantEnum,
  driveTypeEnum,
  gasCategoryEnum
} from "@shared/schema";
import { z } from "zod";

type FactoryInstalledOption = z.infer<typeof factoryInstalledOptionSchema>;
type FieldAccessory = z.infer<typeof fieldAccessorySchema>;

// ============================================================================
// NOMINAL TONNAGE MAPPINGS
// ============================================================================

export const NOMINAL_TONNAGES: NominalTonnages = [
  { tonnage: "2.0", btuCapacity: 24000, minBTU: 22000, maxBTU: 26000 },
  { tonnage: "2.5", btuCapacity: 30000, minBTU: 28000, maxBTU: 32000 },
  { tonnage: "3.0", btuCapacity: 36000, minBTU: 34000, maxBTU: 38000 },
  { tonnage: "3.5", btuCapacity: 42000, minBTU: 40000, maxBTU: 44000 },
  { tonnage: "4.0", btuCapacity: 48000, minBTU: 46000, maxBTU: 50000 },
  { tonnage: "5.0", btuCapacity: 60000, minBTU: 58000, maxBTU: 62000 },
  { tonnage: "6.0", btuCapacity: 72000, minBTU: 70000, maxBTU: 74000 },
  { tonnage: "7.5", btuCapacity: 90000, minBTU: 88000, maxBTU: 92000 },
  { tonnage: "10.0", btuCapacity: 120000, minBTU: 118000, maxBTU: 122000 },
  { tonnage: "12.5", btuCapacity: 150000, minBTU: 148000, maxBTU: 152000 },
  { tonnage: "15.0", btuCapacity: 180000, minBTU: 178000, maxBTU: 182000 },
  { tonnage: "17.5", btuCapacity: 210000, minBTU: 208000, maxBTU: 212000 },
  { tonnage: "20.0", btuCapacity: 240000, minBTU: 238000, maxBTU: 242000 },
  { tonnage: "25.0", btuCapacity: 300000, minBTU: 298000, maxBTU: 302000 }
];

// ============================================================================
// FACTORY-INSTALLED OPTIONS
// ============================================================================

export const ELECTRICAL_ADD_ONS: FactoryInstalledOption[] = [
  { category: "Electrical", code: "HKR", description: "Electric Heat Kit - 10kW", priceAdder: 450 },
  { category: "Electrical", code: "HKR15", description: "Electric Heat Kit - 15kW", priceAdder: 580 },
  { category: "Electrical", code: "HKR20", description: "Electric Heat Kit - 20kW", priceAdder: 720 },
  { category: "Electrical", code: "DIS", description: "Disconnect Switch", priceAdder: 125 },
  { category: "Electrical", code: "CUR", description: "Current Monitoring Relay", priceAdder: 95 },
  { category: "Electrical", code: "LPS", description: "Low Pressure Switch", priceAdder: 85 },
  { category: "Electrical", code: "HPS", description: "High Pressure Switch", priceAdder: 85 },
  { category: "Electrical", code: "CTL", description: "Control Circuit Transformer", priceAdder: 110 }
];

export const CONTROL_ADD_ONS: FactoryInstalledOption[] = [
  { category: "Controls", code: "DFT", description: "Defrost Control Board", priceAdder: 180 },
  { category: "Controls", code: "APP", description: "APP Connection Module", priceAdder: 225 },
  { category: "Controls", code: "DCV", description: "Demand Control Ventilation", priceAdder: 350 },
  { category: "Controls", code: "ECO", description: "Economizer Integration", priceAdder: 425 },
  { category: "Controls", code: "BAS", description: "Building Automation System Interface", priceAdder: 375 }
];

export const REFRIGERANT_ADD_ONS: FactoryInstalledOption[] = [
  { category: "Refrigerant", code: "LLT", description: "Low-Loss Fitting Kit", priceAdder: 145 },
  { category: "Refrigerant", code: "SGT", description: "Sight Glass and Filter Drier", priceAdder: 165 },
  { category: "Refrigerant", code: "PMP", description: "Pump Down Control", priceAdder: 195 }
];

// ============================================================================
// FIELD ACCESSORIES
// ============================================================================

export const FIELD_ACCESSORIES: FieldAccessory[] = [
  { category: "Filters", code: "FLT16", description: "Standard Efficiency Filter (16x25x1)", compatible: ["DZ17SA", "DZ20SA"] },
  { category: "Filters", code: "FLT20", description: "High Efficiency Filter (20x25x2)", compatible: ["DZ17SA", "DZ20SA"] },
  { category: "Filters", code: "FLTMERV8", description: "MERV 8 Pleated Filter", compatible: ["DZ17SA", "DZ20SA"] },
  { category: "Filters", code: "FLTMERV11", description: "MERV 11 Pleated Filter", compatible: ["DZ17SA", "DZ20SA"] },
  { category: "Controls", code: "TSTPROG", description: "Programmable Thermostat", compatible: ["all"] },
  { category: "Controls", code: "TSTSMART", description: "Smart WiFi Thermostat", compatible: ["all"] },
  { category: "Sensors", code: "SNSOUT", description: "Outdoor Temperature Sensor", compatible: ["all"] },
  { category: "Sensors", code: "SNSRET", description: "Return Air Temperature Sensor", compatible: ["all"] },
  { category: "Dampers", code: "DMPMOT", description: "Motorized Damper Control", compatible: ["all"] },
  { category: "Dampers", code: "DMPRET", description: "Return Air Damper", compatible: ["all"] }
];

// ============================================================================
// DAIKIN PRODUCT FAMILIES
// ============================================================================

export const DAIKIN_FAMILIES: DaikinFamily[] = [
  {
    familyName: "DZ17SA",
    modelTemplate: "DZ17SA{size}{voltage}{phases}A",
    systemType: "Heat Pump",
    availableTonnages: ["2.0", "2.5", "3.0", "3.5", "4.0", "5.0", "6.0", "7.5", "10.0"],
    availableVoltages: ["208-230", "460"],
    availablePhases: ["1", "3"],
    refrigerant: "R-32",
    nomenclatureSegments: [
      {
        position: 1,
        code: "DZ",
        description: "Daikin Package Unit",
        options: [
          { value: "DZ", description: "Daikin Package Unit", implications: ["Standard efficiency"] }
        ]
      },
      {
        position: 2,
        code: "17",
        description: "SEER Rating",
        options: [
          { value: "17", description: "17 SEER Standard Efficiency", implications: ["Standard efficiency"] },
          { value: "20", description: "20 SEER High Efficiency", implications: ["High efficiency"] }
        ]
      },
      {
        position: 3,
        code: "SA",
        description: "System Type",
        options: [
          { value: "SA", description: "Heat Pump", implications: ["Heat pump operation"] }
        ]
      },
      {
        position: 4,
        code: "Size",
        description: "Tonnage",
        options: [
          { value: "024", description: "2.0 Ton", implications: ["24,000 BTU/h"] },
          { value: "030", description: "2.5 Ton", implications: ["30,000 BTU/h"] },
          { value: "036", description: "3.0 Ton", implications: ["36,000 BTU/h"] },
          { value: "042", description: "3.5 Ton", implications: ["42,000 BTU/h"] },
          { value: "048", description: "4.0 Ton", implications: ["48,000 BTU/h"] },
          { value: "060", description: "5.0 Ton", implications: ["60,000 BTU/h"] },
          { value: "072", description: "6.0 Ton", implications: ["72,000 BTU/h"] },
          { value: "090", description: "7.5 Ton", implications: ["90,000 BTU/h"] },
          { value: "120", description: "10.0 Ton", implications: ["120,000 BTU/h"] }
        ]
      },
      {
        position: 5,
        code: "Voltage",
        description: "Voltage Configuration",
        options: [
          { value: "2", description: "208-230V", implications: ["Low voltage"] },
          { value: "4", description: "460V", implications: ["High voltage"] }
        ]
      },
      {
        position: 6,
        code: "Phases",
        description: "Phase Configuration",
        options: [
          { value: "1", description: "Single Phase", implications: ["Residential/light commercial"] },
          { value: "3", description: "Three Phase", implications: ["Commercial/industrial"] }
        ]
      }
    ],
    baseSpecs: {
      seerRange: { min: 17, max: 17 },
      soundLevel: { min: 65, max: 72 },
      driveType: "Variable Speed",
      warranty: 10
    }
  },
  {
    familyName: "DZ20SA",
    modelTemplate: "DZ20SA{size}{voltage}{phases}A",
    systemType: "Heat Pump",
    availableTonnages: ["2.0", "2.5", "3.0", "3.5", "4.0", "5.0", "6.0", "7.5", "10.0"],
    availableVoltages: ["208-230", "460"],
    availablePhases: ["1", "3"],
    refrigerant: "R-32",
    nomenclatureSegments: [
      {
        position: 1,
        code: "DZ",
        description: "Daikin Package Unit",
        options: [
          { value: "DZ", description: "Daikin Package Unit", implications: ["High efficiency"] }
        ]
      },
      {
        position: 2,
        code: "20",
        description: "SEER Rating",
        options: [
          { value: "20", description: "20 SEER High Efficiency", implications: ["High efficiency"] }
        ]
      },
      {
        position: 3,
        code: "SA",
        description: "System Type",
        options: [
          { value: "SA", description: "Heat Pump", implications: ["Heat pump operation"] }
        ]
      },
      {
        position: 4,
        code: "Size",
        description: "Tonnage",
        options: [
          { value: "024", description: "2.0 Ton", implications: ["24,000 BTU/h"] },
          { value: "030", description: "2.5 Ton", implications: ["30,000 BTU/h"] },
          { value: "036", description: "3.0 Ton", implications: ["36,000 BTU/h"] },
          { value: "042", description: "3.5 Ton", implications: ["42,000 BTU/h"] },
          { value: "048", description: "4.0 Ton", implications: ["48,000 BTU/h"] },
          { value: "060", description: "5.0 Ton", implications: ["60,000 BTU/h"] },
          { value: "072", description: "6.0 Ton", implications: ["72,000 BTU/h"] },
          { value: "090", description: "7.5 Ton", implications: ["90,000 BTU/h"] },
          { value: "120", description: "10.0 Ton", implications: ["120,000 BTU/h"] }
        ]
      },
      {
        position: 5,
        code: "Voltage",
        description: "Voltage Configuration",
        options: [
          { value: "2", description: "208-230V", implications: ["Low voltage"] },
          { value: "4", description: "460V", implications: ["High voltage"] }
        ]
      },
      {
        position: 6,
        code: "Phases",
        description: "Phase Configuration",
        options: [
          { value: "1", description: "Single Phase", implications: ["Residential/light commercial"] },
          { value: "3", description: "Three Phase", implications: ["Commercial/industrial"] }
        ]
      }
    ],
    baseSpecs: {
      seerRange: { min: 20, max: 20 },
      soundLevel: { min: 62, max: 69 },
      driveType: "Variable Speed",
      warranty: 10
    }
  },
  {
    familyName: "DZ17GS",
    modelTemplate: "DZ17GS{size}{voltage}{phases}{gasType}A",
    systemType: "Gas/Electric",
    availableTonnages: ["3.0", "3.5", "4.0", "5.0", "6.0", "7.5", "10.0", "12.5", "15.0"],
    availableVoltages: ["208-230", "460"],
    availablePhases: ["1", "3"],
    refrigerant: "R-32",
    nomenclatureSegments: [
      {
        position: 1,
        code: "DZ",
        description: "Daikin Package Unit",
        options: [
          { value: "DZ", description: "Daikin Package Unit", implications: ["Standard efficiency"] }
        ]
      },
      {
        position: 2,
        code: "17",
        description: "SEER Rating",
        options: [
          { value: "17", description: "17 SEER Standard Efficiency", implications: ["Standard efficiency"] }
        ]
      },
      {
        position: 3,
        code: "GS",
        description: "System Type",
        options: [
          { value: "GS", description: "Gas/Electric Package Unit", implications: ["Gas heating", "Electric cooling"] }
        ]
      },
      {
        position: 4,
        code: "Size",
        description: "Tonnage",
        options: [
          { value: "036", description: "3.0 Ton", implications: ["36,000 BTU/h cooling"] },
          { value: "042", description: "3.5 Ton", implications: ["42,000 BTU/h cooling"] },
          { value: "048", description: "4.0 Ton", implications: ["48,000 BTU/h cooling"] },
          { value: "060", description: "5.0 Ton", implications: ["60,000 BTU/h cooling"] },
          { value: "072", description: "6.0 Ton", implications: ["72,000 BTU/h cooling"] },
          { value: "090", description: "7.5 Ton", implications: ["90,000 BTU/h cooling"] },
          { value: "120", description: "10.0 Ton", implications: ["120,000 BTU/h cooling"] },
          { value: "150", description: "12.5 Ton", implications: ["150,000 BTU/h cooling"] },
          { value: "180", description: "15.0 Ton", implications: ["180,000 BTU/h cooling"] }
        ]
      },
      {
        position: 5,
        code: "Voltage",
        description: "Voltage Configuration",
        options: [
          { value: "2", description: "208-230V", implications: ["Low voltage"] },
          { value: "4", description: "460V", implications: ["High voltage"] }
        ]
      },
      {
        position: 6,
        code: "Phases",
        description: "Phase Configuration",
        options: [
          { value: "1", description: "Single Phase", implications: ["Residential/light commercial"] },
          { value: "3", description: "Three Phase", implications: ["Commercial/industrial"] }
        ]
      },
      {
        position: 7,
        code: "GasType",
        description: "Gas Type",
        options: [
          { value: "N", description: "Natural Gas", implications: ["Natural gas heating"] },
          { value: "P", description: "Propane", implications: ["Propane heating"] }
        ]
      }
    ],
    baseSpecs: {
      seerRange: { min: 17, max: 17 },
      soundLevel: { min: 68, max: 75 },
      driveType: "Variable Speed",
      warranty: 10
    }
  },
  {
    familyName: "DZ17AC",
    modelTemplate: "DZ17AC{size}{voltage}{phases}A",
    systemType: "Straight A/C",
    availableTonnages: ["2.0", "2.5", "3.0", "3.5", "4.0", "5.0", "6.0", "7.5", "10.0", "12.5", "15.0"],
    availableVoltages: ["208-230", "460"],
    availablePhases: ["1", "3"],
    refrigerant: "R-32",
    nomenclatureSegments: [
      {
        position: 1,
        code: "DZ",
        description: "Daikin Package Unit",
        options: [
          { value: "DZ", description: "Daikin Package Unit", implications: ["Standard efficiency"] }
        ]
      },
      {
        position: 2,
        code: "17",
        description: "SEER Rating",
        options: [
          { value: "17", description: "17 SEER Standard Efficiency", implications: ["Standard efficiency"] }
        ]
      },
      {
        position: 3,
        code: "AC",
        description: "System Type",
        options: [
          { value: "AC", description: "Air Conditioning Only", implications: ["Cooling only"] }
        ]
      },
      {
        position: 4,
        code: "Size",
        description: "Tonnage",
        options: [
          { value: "024", description: "2.0 Ton", implications: ["24,000 BTU/h"] },
          { value: "030", description: "2.5 Ton", implications: ["30,000 BTU/h"] },
          { value: "036", description: "3.0 Ton", implications: ["36,000 BTU/h"] },
          { value: "042", description: "3.5 Ton", implications: ["42,000 BTU/h"] },
          { value: "048", description: "4.0 Ton", implications: ["48,000 BTU/h"] },
          { value: "060", description: "5.0 Ton", implications: ["60,000 BTU/h"] },
          { value: "072", description: "6.0 Ton", implications: ["72,000 BTU/h"] },
          { value: "090", description: "7.5 Ton", implications: ["90,000 BTU/h"] },
          { value: "120", description: "10.0 Ton", implications: ["120,000 BTU/h"] },
          { value: "150", description: "12.5 Ton", implications: ["150,000 BTU/h"] },
          { value: "180", description: "15.0 Ton", implications: ["180,000 BTU/h"] }
        ]
      },
      {
        position: 5,
        code: "Voltage",
        description: "Voltage Configuration",
        options: [
          { value: "2", description: "208-230V", implications: ["Low voltage"] },
          { value: "4", description: "460V", implications: ["High voltage"] }
        ]
      },
      {
        position: 6,
        code: "Phases",
        description: "Phase Configuration",
        options: [
          { value: "1", description: "Single Phase", implications: ["Residential/light commercial"] },
          { value: "3", description: "Three Phase", implications: ["Commercial/industrial"] }
        ]
      }
    ],
    baseSpecs: {
      seerRange: { min: 17, max: 17 },
      soundLevel: { min: 67, max: 74 },
      driveType: "Variable Speed",
      warranty: 10
    }
  }
];

// ============================================================================
// COMPREHENSIVE DAIKIN R-32 PACKAGE UNIT CATALOG
// ============================================================================

export const generateDaikinUnitCatalog = (): DaikinUnitSpec[] => {
  const catalog: DaikinUnitSpec[] = [];
  
  // Generate units for each family
  for (const family of DAIKIN_FAMILIES) {
    for (const tonnage of family.availableTonnages) {
      for (const voltage of family.availableVoltages) {
        for (const phases of family.availablePhases) {
          // Skip certain combinations that don't exist in real products
          if (tonnage === "2.0" && voltage === "460") continue; // 2-ton not available in 460V
          if (parseFloat(tonnage) <= 3.0 && phases === "3") continue; // Small units typically single phase
          
          const tonnageInfo = NOMINAL_TONNAGES.find(t => t.tonnage === tonnage)!;
          const seerRating = family.familyName.includes("20") ? 20 : 17;
          const isHighEfficiency = seerRating >= 20;
          
          // Generate base specifications
          const specs: DaikinUnitSpec = {
            id: `${family.familyName.toLowerCase()}_${tonnage.replace(".", "")}_${voltage.replace("-", "")}_${phases}ph`,
            modelNumber: generateModelNumber(family, tonnage, voltage, phases),
            brand: "Daikin",
            systemType: family.systemType,
            tonnage: tonnage as any,
            btuCapacity: tonnageInfo.btuCapacity,
            voltage: voltage as any,
            phases: phases as any,
            
            // Performance ratings
            seerRating,
            eerRating: isHighEfficiency ? 13.2 : 12.8,
            hspfRating: family.systemType === "Heat Pump" ? (isHighEfficiency ? 10.2 : 9.6) : undefined,
            
            // Technical specifications
            refrigerant: "R-32",
            driveType: "Variable Speed",
            coolingStages: parseFloat(tonnage) >= 7.5 ? 2 : 1,
            heatingStages: family.systemType === "Heat Pump" ? 2 : undefined,
            soundLevel: calculateSoundLevel(parseFloat(tonnage), isHighEfficiency),
            
            // Physical specifications
            dimensions: calculateDimensions(parseFloat(tonnage)),
            weight: calculateWeight(parseFloat(tonnage), family.systemType),
            
            // System components
            controls: ["Microprocessor Control", "Variable Speed Drive", "Diagnostic LEDs"],
            sensors: ["Outdoor Temperature", "Return Air", "Discharge Air"],
            coils: isHighEfficiency ? "Enhanced Microchannel" : "Standard Microchannel",
            
            // Add-ons and accessories
            electricalAddOns: ELECTRICAL_ADD_ONS,
            fieldAccessories: FIELD_ACCESSORIES,
            
            // Service and warranty
            serviceOptions: ["Standard Service", "Extended Warranty", "Preventive Maintenance"],
            warranty: 10,
            
            // Indoor Air Quality features
            iaqFeatures: isHighEfficiency ? ["Advanced Filtration", "UV Light Ready", "Humidity Control"] : ["Standard Filtration"],
            
            // Gas-specific fields for Gas/Electric systems
            heatingBTU: family.systemType === "Gas/Electric" ? calculateGasHeatingBTU(parseFloat(tonnage)) : undefined,
            gasCategory: family.systemType === "Gas/Electric" ? "Natural Gas" : undefined,
            
            // Heat pump specific fields
            heatKitKW: family.systemType === "Heat Pump" ? calculateHeatKitKW(parseFloat(tonnage)) : undefined,
            lowTempOperation: family.systemType === "Heat Pump" ? -10 : undefined
          };
          
          catalog.push(specs);
          
          // Generate propane variant for Gas/Electric units
          if (family.systemType === "Gas/Electric") {
            const propaneSpecs = { 
              ...specs, 
              id: `${specs.id}_propane`,
              modelNumber: specs.modelNumber.replace("GS", "GS").slice(0, -1) + "PA",
              gasCategory: "Propane" as any,
              heatingBTU: specs.heatingBTU ? specs.heatingBTU * 0.95 : undefined // Propane slightly less efficient
            };
            catalog.push(propaneSpecs);
          }
        }
      }
    }
  }
  
  return catalog;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateModelNumber(family: DaikinFamily, tonnage: string, voltage: string, phases: string): string {
  const tonnageCode = (parseFloat(tonnage) * 12).toString().padStart(3, '0'); // Convert to BTU thousands
  const voltageCode = voltage === "208-230" ? "2" : "4";
  const phaseCode = phases;
  
  let template = family.modelTemplate;
  template = template.replace("{size}", tonnageCode);
  template = template.replace("{voltage}", voltageCode);
  template = template.replace("{phases}", phaseCode);
  
  return template;
}

function calculateSoundLevel(tonnage: number, isHighEfficiency: boolean): number {
  const baseSoundLevel = isHighEfficiency ? 62 : 67;
  const sizeMultiplier = Math.floor(tonnage / 2.5); // Add 1 dB per 2.5 tons
  return baseSoundLevel + sizeMultiplier;
}

function calculateDimensions(tonnage: number): { length: number; width: number; height: number } {
  if (tonnage <= 3.0) return { length: 35, width: 35, height: 28 };
  if (tonnage <= 5.0) return { length: 44, width: 44, height: 32 };
  if (tonnage <= 7.5) return { length: 48, width: 48, height: 36 };
  if (tonnage <= 12.5) return { length: 54, width: 54, height: 40 };
  return { length: 60, width: 60, height: 44 };
}

function calculateWeight(tonnage: number, systemType: string): number {
  const baseWeight = tonnage * 45; // Base weight per ton
  const systemMultiplier = systemType === "Gas/Electric" ? 1.3 : 1.0; // Gas units are heavier
  return Math.round(baseWeight * systemMultiplier + 150); // Add base unit weight
}

function calculateGasHeatingBTU(tonnage: number): number {
  // Gas heating typically 2.5x cooling capacity for package units
  return Math.round(tonnage * 12000 * 2.5);
}

function calculateHeatKitKW(tonnage: number): number {
  // Electric heat kit typically 5kW per ton for heat pumps
  return Math.round(tonnage * 5);
}

// ============================================================================
// EXPORT CATALOG
// ============================================================================

export const DAIKIN_R32_CATALOG = generateDaikinUnitCatalog();

// Helper function to get units by family
export function getUnitsByFamily(familyName: string): DaikinUnitSpec[] {
  return DAIKIN_R32_CATALOG.filter(unit => unit.modelNumber.startsWith(familyName));
}

// Helper function to get available tonnages for a system type
export function getAvailableTonnages(systemType: string): string[] {
  const family = DAIKIN_FAMILIES.find(f => f.systemType === systemType);
  return family ? family.availableTonnages : [];
}

// Helper function to convert BTU to tonnage
export function btuToTonnage(btuCapacity: number, rounded: boolean = true): { tonnage: string; exactTonnage: number } {
  const exactTonnage = btuCapacity / 12000;
  
  if (!rounded) {
    return { tonnage: exactTonnage.toFixed(1), exactTonnage };
  }
  
  // Find nearest standard tonnage
  let nearestTonnage = NOMINAL_TONNAGES[0];
  let minDifference = Math.abs(btuCapacity - nearestTonnage.btuCapacity);
  
  for (const tonnageInfo of NOMINAL_TONNAGES) {
    const difference = Math.abs(btuCapacity - tonnageInfo.btuCapacity);
    if (difference < minDifference) {
      minDifference = difference;
      nearestTonnage = tonnageInfo;
    }
  }
  
  return { tonnage: nearestTonnage.tonnage, exactTonnage };
}

// Helper function to validate voltage/phase combinations
export function isValidVoltagePhase(voltage: string, phases: string): boolean {
  const validCombinations = [
    { voltage: "208-230", phases: "1" },
    { voltage: "208-230", phases: "3" },
    { voltage: "460", phases: "3" },
    { voltage: "575", phases: "3" }
  ];
  
  return validCombinations.some(combo => combo.voltage === voltage && combo.phases === phases);
}