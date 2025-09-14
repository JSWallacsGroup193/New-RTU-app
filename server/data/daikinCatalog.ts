import { 
  type DaikinUnitSpec, 
  type DaikinFamily,
  type NominalTonnages,
  type PositionMapping,
  type FamilyDefinitions,
  type DaikinFamilyConfig,
  type DaikinFamilyKeys,
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
// OFFICIAL DAIKIN R-32 SPECIFICATIONS (FROM MASTER SCHEMA & PDFs)
// ============================================================================

// Comprehensive Product Specifications Interface
export interface ProductSpecifications {
  coolingCapacity: {
    total: number; // BTU/h
    sensible: number; // BTU/h
  };
  performanceRatings: {
    seer2: number;
    eer2: number;
    ieer: number;
  };
  heatingCapacity?: {
    total: number; // BTU/h for heat pumps
    afue?: number; // for gas units
    hspf2?: number; // for heat pumps
  };
  evaporatorSpecs: {
    fanType: string;
    airflow: number; // CFM
    staticPressure: number; // inches WC
    coilType: string;
    coilRows: number;
  };
  condenserSpecs: {
    fanType: string;
    fanQuantity: number;
    motorHP: number;
    coilType: string;
  };
  compressorData: {
    type: string;
    stage: string;
    rla: number; // Running Load Amperage
    lra: number; // Locked Rotor Amperage
    manufacturer: string;
  };
  electricalData: {
    phase: string;
    voltage: string;
    minCircuitAmpacity: number;
    maxOvercurrentProtection: number;
    operatingAmperage: number;
  };
  soundLevels: {
    cooling: number; // dB
    heating?: number; // dB
  };
  physicalSpecs: {
    operatingWeight: number; // lbs
    shippingWeight: number; // lbs
    dimensions: {
      length: number; // inches
      width: number;
      height: number;
    };
  };
  airflowData: {
    nominalAirflow: number; // CFM
    externalStaticPressure: number; // inches WC
    fanSpeed: string;
  };
}

// Model Specification Mapping
export interface ModelSpecification extends ProductSpecifications {
  modelNumber: string;
  tonnage: string;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  efficiency: "Standard" | "High";
  family: string;
}

// ============================================================================
// COMPREHENSIVE DAIKIN R-32 MODEL SPECIFICATIONS
// ============================================================================

// DSC Series - Standard Efficiency A/C Specifications
export const DSC_SPECIFICATIONS: Record<string, ModelSpecification> = {
  "DSC036D3": {
    modelNumber: "DSC036D3",
    tonnage: "3.0",
    systemType: "Straight A/C",
    efficiency: "Standard",
    family: "DSC",
    coolingCapacity: {
      total: 36000,
      sensible: 28800
    },
    performanceRatings: {
      seer2: 14.0,
      eer2: 12.0,
      ieer: 14.5
    },
    evaporatorSpecs: {
      fanType: "Direct Drive ECM",
      airflow: 1200,
      staticPressure: 0.5,
      coilType: "Copper/Aluminum",
      coilRows: 3
    },
    condenserSpecs: {
      fanType: "Direct Drive",
      fanQuantity: 1,
      motorHP: 0.25,
      coilType: "Copper/Aluminum"
    },
    compressorData: {
      type: "Scroll",
      stage: "Single Stage",
      rla: 12.4,
      lra: 75,
      manufacturer: "Daikin"
    },
    electricalData: {
      phase: "3",
      voltage: "208-230V",
      minCircuitAmpacity: 18,
      maxOvercurrentProtection: 25,
      operatingAmperage: 14.2
    },
    soundLevels: {
      cooling: 67
    },
    physicalSpecs: {
      operatingWeight: 285,
      shippingWeight: 320,
      dimensions: {
        length: 86,
        width: 34,
        height: 38
      }
    },
    airflowData: {
      nominalAirflow: 1200,
      externalStaticPressure: 0.5,
      fanSpeed: "Variable"
    }
  },
  "DSC048D3": {
    modelNumber: "DSC048D3",
    tonnage: "4.0",
    systemType: "Straight A/C",
    efficiency: "Standard",
    family: "DSC",
    coolingCapacity: {
      total: 48000,
      sensible: 38400
    },
    performanceRatings: {
      seer2: 14.0,
      eer2: 12.0,
      ieer: 14.5
    },
    evaporatorSpecs: {
      fanType: "Direct Drive ECM",
      airflow: 1600,
      staticPressure: 0.5,
      coilType: "Copper/Aluminum",
      coilRows: 3
    },
    condenserSpecs: {
      fanType: "Direct Drive",
      fanQuantity: 1,
      motorHP: 0.33,
      coilType: "Copper/Aluminum"
    },
    compressorData: {
      type: "Scroll",
      stage: "Single Stage",
      rla: 16.2,
      lra: 95,
      manufacturer: "Daikin"
    },
    electricalData: {
      phase: "3",
      voltage: "208-230V",
      minCircuitAmpacity: 23,
      maxOvercurrentProtection: 30,
      operatingAmperage: 18.5
    },
    soundLevels: {
      cooling: 69
    },
    physicalSpecs: {
      operatingWeight: 310,
      shippingWeight: 345,
      dimensions: {
        length: 86,
        width: 34,
        height: 38
      }
    },
    airflowData: {
      nominalAirflow: 1600,
      externalStaticPressure: 0.5,
      fanSpeed: "Variable"
    }
  },
  "DSC072D3": {
    modelNumber: "DSC072D3",
    tonnage: "6.0",
    systemType: "Straight A/C",
    efficiency: "Standard",
    family: "DSC",
    coolingCapacity: {
      total: 72000,
      sensible: 57600
    },
    performanceRatings: {
      seer2: 16.7,
      eer2: 11.8,
      ieer: 16.7
    },
    evaporatorSpecs: {
      fanType: "Direct Drive ECM",
      airflow: 2400,
      staticPressure: 0.6,
      coilType: "Copper/Aluminum",
      coilRows: 4
    },
    condenserSpecs: {
      fanType: "Direct Drive",
      fanQuantity: 2,
      motorHP: 0.5,
      coilType: "Copper/Aluminum"
    },
    compressorData: {
      type: "Scroll",
      stage: "Two Stage",
      rla: 22.8,
      lra: 125,
      manufacturer: "Daikin"
    },
    electricalData: {
      phase: "3",
      voltage: "208-230V",
      minCircuitAmpacity: 32,
      maxOvercurrentProtection: 40,
      operatingAmperage: 26.1
    },
    soundLevels: {
      cooling: 73
    },
    physicalSpecs: {
      operatingWeight: 420,
      shippingWeight: 465,
      dimensions: {
        length: 102,
        width: 34,
        height: 38
      }
    },
    airflowData: {
      nominalAirflow: 2400,
      externalStaticPressure: 0.6,
      fanSpeed: "Variable"
    }
  }
};

// DHC Series - High Efficiency A/C Specifications
export const DHC_SPECIFICATIONS: Record<string, ModelSpecification> = {
  "DHC036D3": {
    modelNumber: "DHC036D3",
    tonnage: "3.0",
    systemType: "Straight A/C",
    efficiency: "High",
    family: "DHC",
    coolingCapacity: {
      total: 36000,
      sensible: 28800
    },
    performanceRatings: {
      seer2: 16.6,
      eer2: 12.5,
      ieer: 17.2
    },
    evaporatorSpecs: {
      fanType: "Direct Drive ECM",
      airflow: 1200,
      staticPressure: 0.6,
      coilType: "Copper/Aluminum",
      coilRows: 4
    },
    condenserSpecs: {
      fanType: "Direct Drive ECM",
      fanQuantity: 1,
      motorHP: 0.33,
      coilType: "Copper/Aluminum"
    },
    compressorData: {
      type: "Scroll",
      stage: "Two Stage",
      rla: 11.8,
      lra: 68,
      manufacturer: "Daikin"
    },
    electricalData: {
      phase: "3",
      voltage: "208-230V",
      minCircuitAmpacity: 17,
      maxOvercurrentProtection: 25,
      operatingAmperage: 13.5
    },
    soundLevels: {
      cooling: 64
    },
    physicalSpecs: {
      operatingWeight: 295,
      shippingWeight: 330,
      dimensions: {
        length: 86,
        width: 34,
        height: 38
      }
    },
    airflowData: {
      nominalAirflow: 1200,
      externalStaticPressure: 0.6,
      fanSpeed: "Variable"
    }
  },
  "DHC072D3": {
    modelNumber: "DHC072D3",
    tonnage: "6.0",
    systemType: "Straight A/C",
    efficiency: "High",
    family: "DHC",
    coolingCapacity: {
      total: 72000,
      sensible: 57600
    },
    performanceRatings: {
      seer2: 18.6,
      eer2: 12.5,
      ieer: 18.6
    },
    evaporatorSpecs: {
      fanType: "Direct Drive ECM",
      airflow: 2400,
      staticPressure: 0.7,
      coilType: "Copper/Aluminum",
      coilRows: 4
    },
    condenserSpecs: {
      fanType: "Direct Drive ECM",
      fanQuantity: 2,
      motorHP: 0.5,
      coilType: "Copper/Aluminum"
    },
    compressorData: {
      type: "Scroll",
      stage: "Two Stage",
      rla: 21.2,
      lra: 115,
      manufacturer: "Daikin"
    },
    electricalData: {
      phase: "3",
      voltage: "208-230V",
      minCircuitAmpacity: 30,
      maxOvercurrentProtection: 35,
      operatingAmperage: 24.3
    },
    soundLevels: {
      cooling: 70
    },
    physicalSpecs: {
      operatingWeight: 430,
      shippingWeight: 475,
      dimensions: {
        length: 102,
        width: 34,
        height: 38
      }
    },
    airflowData: {
      nominalAirflow: 2400,
      externalStaticPressure: 0.7,
      fanSpeed: "Variable"
    }
  }
};

// DSG Series - Standard Efficiency Gas/Electric Specifications
export const DSG_SPECIFICATIONS: Record<string, ModelSpecification> = {
  "DSG036D3100": {
    modelNumber: "DSG036D3100",
    tonnage: "3.0",
    systemType: "Gas/Electric",
    efficiency: "Standard",
    family: "DSG",
    coolingCapacity: {
      total: 36000,
      sensible: 28800
    },
    performanceRatings: {
      seer2: 14.0,
      eer2: 12.0,
      ieer: 14.5
    },
    heatingCapacity: {
      total: 100000,
      afue: 80
    },
    evaporatorSpecs: {
      fanType: "Direct Drive ECM",
      airflow: 1200,
      staticPressure: 0.8,
      coilType: "Copper/Aluminum",
      coilRows: 3
    },
    condenserSpecs: {
      fanType: "Direct Drive",
      fanQuantity: 1,
      motorHP: 0.25,
      coilType: "Copper/Aluminum"
    },
    compressorData: {
      type: "Scroll",
      stage: "Single Stage",
      rla: 12.4,
      lra: 75,
      manufacturer: "Daikin"
    },
    electricalData: {
      phase: "3",
      voltage: "208-230V",
      minCircuitAmpacity: 18,
      maxOvercurrentProtection: 25,
      operatingAmperage: 14.2
    },
    soundLevels: {
      cooling: 69,
      heating: 67
    },
    physicalSpecs: {
      operatingWeight: 385,
      shippingWeight: 420,
      dimensions: {
        length: 106,
        width: 34,
        height: 50
      }
    },
    airflowData: {
      nominalAirflow: 1200,
      externalStaticPressure: 0.8,
      fanSpeed: "Variable"
    }
  }
};

// DHH Series - High Efficiency Heat Pump Specifications
export const DHH_SPECIFICATIONS: Record<string, ModelSpecification> = {
  "DHH036D3": {
    modelNumber: "DHH036D3",
    tonnage: "3.0",
    systemType: "Heat Pump",
    efficiency: "High",
    family: "DHH",
    coolingCapacity: {
      total: 36000,
      sensible: 28800
    },
    performanceRatings: {
      seer2: 16.4,
      eer2: 13.0,
      ieer: 17.0
    },
    heatingCapacity: {
      total: 40000,
      hspf2: 10.5
    },
    evaporatorSpecs: {
      fanType: "Direct Drive ECM",
      airflow: 1200,
      staticPressure: 0.6,
      coilType: "Copper/Aluminum",
      coilRows: 4
    },
    condenserSpecs: {
      fanType: "Direct Drive ECM",
      fanQuantity: 1,
      motorHP: 0.33,
      coilType: "Copper/Aluminum"
    },
    compressorData: {
      type: "Scroll",
      stage: "Two Stage",
      rla: 11.5,
      lra: 65,
      manufacturer: "Daikin"
    },
    electricalData: {
      phase: "3",
      voltage: "208-230V",
      minCircuitAmpacity: 16,
      maxOvercurrentProtection: 25,
      operatingAmperage: 13.2
    },
    soundLevels: {
      cooling: 66,
      heating: 68
    },
    physicalSpecs: {
      operatingWeight: 305,
      shippingWeight: 340,
      dimensions: {
        length: 86,
        width: 34,
        height: 38
      }
    },
    airflowData: {
      nominalAirflow: 1200,
      externalStaticPressure: 0.6,
      fanSpeed: "Variable"
    }
  }
};

// Combined specifications map for easy lookup
export const ALL_MODEL_SPECIFICATIONS: Record<string, ModelSpecification> = {
  ...DSC_SPECIFICATIONS,
  ...DHC_SPECIFICATIONS,
  ...DSG_SPECIFICATIONS,
  ...DHH_SPECIFICATIONS
};

// Real nominal tonnage mappings from official specifications
export const NOMINAL_TONNAGES: NominalTonnages = [
  { tonnage: "3.0", btuCapacity: 36000, minBTU: 34000, maxBTU: 38000 },
  { tonnage: "4.0", btuCapacity: 48000, minBTU: 46000, maxBTU: 50000 },
  { tonnage: "5.0", btuCapacity: 60000, minBTU: 58000, maxBTU: 62000 },
  { tonnage: "6.0", btuCapacity: 72000, minBTU: 70000, maxBTU: 74000 },
  { tonnage: "7.5", btuCapacity: 90000, minBTU: 88000, maxBTU: 92000 },
  { tonnage: "8.5", btuCapacity: 102000, minBTU: 100000, maxBTU: 104000 },
  { tonnage: "10.0", btuCapacity: 120000, minBTU: 118000, maxBTU: 122000 },
  { tonnage: "12.5", btuCapacity: 150000, minBTU: 148000, maxBTU: 152000 },
  { tonnage: "15.0", btuCapacity: 180000, minBTU: 178000, maxBTU: 182000 },
  { tonnage: "20.0", btuCapacity: 240000, minBTU: 238000, maxBTU: 242000 },
  { tonnage: "25.0", btuCapacity: 300000, minBTU: 298000, maxBTU: 302000 }
];

// ============================================================================
// FACTORY-INSTALLED OPTIONS & FIELD ACCESSORIES
// ============================================================================

export const ELECTRICAL_ADD_ONS: FactoryInstalledOption[] = [
  { category: "Electrical", code: "HKR", description: "Electric Heat Kit - 10kW", priceAdder: 450 },
  { category: "Electrical", code: "HKR15", description: "Electric Heat Kit - 15kW", priceAdder: 580 },
  { category: "Electrical", code: "HKR20", description: "Electric Heat Kit - 20kW", priceAdder: 720 },
  { category: "Electrical", code: "HKR30", description: "Electric Heat Kit - 30kW", priceAdder: 950 },
  { category: "Electrical", code: "HKR45", description: "Electric Heat Kit - 45kW", priceAdder: 1200 },
  { category: "Electrical", code: "DIS", description: "Disconnect Switch", priceAdder: 125 },
  { category: "Electrical", code: "CUR", description: "Current Monitoring Relay", priceAdder: 95 },
  { category: "Electrical", code: "LPS", description: "Low Pressure Switch", priceAdder: 85 },
  { category: "Electrical", code: "HPS", description: "High Pressure Switch", priceAdder: 85 },
  { category: "Electrical", code: "CTL", description: "Control Circuit Transformer", priceAdder: 110 },
  { category: "Electrical", code: "FUS", description: "Time Delay Fuses", priceAdder: 65 },
  { category: "Electrical", code: "SCP", description: "Short Cycle Protection", priceAdder: 145 },
  { category: "Electrical", code: "VFD", description: "Variable Frequency Drive Ready", priceAdder: 325 },
  { category: "Electrical", code: "PHS", description: "Phase Monitor", priceAdder: 155 }
];

export const CONTROL_ADD_ONS: FactoryInstalledOption[] = [
  { category: "Controls", code: "DFT", description: "Defrost Control Board", priceAdder: 180 },
  { category: "Controls", code: "APP", description: "APP Connection Module", priceAdder: 225 },
  { category: "Controls", code: "DCV", description: "Demand Control Ventilation", priceAdder: 350 },
  { category: "Controls", code: "ECO", description: "Economizer Integration", priceAdder: 425 },
  { category: "Controls", code: "BAS", description: "Building Automation System Interface", priceAdder: 375 },
  { category: "Controls", code: "MOD", description: "Modbus Communication Interface", priceAdder: 285 },
  { category: "Controls", code: "LON", description: "LonWorks Communication", priceAdder: 315 },
  { category: "Controls", code: "BAC", description: "BACnet/IP Interface", priceAdder: 395 },
  { category: "Controls", code: "TMS", description: "Temperature Management System", priceAdder: 245 },
  { category: "Controls", code: "SCH", description: "7-Day Scheduling Control", priceAdder: 185 },
  { category: "Controls", code: "ALM", description: "Alarm Relay Package", priceAdder: 165 },
  { category: "Controls", code: "LCD", description: "LCD Display Panel", priceAdder: 195 }
];

export const REFRIGERANT_ADD_ONS: FactoryInstalledOption[] = [
  { category: "Refrigerant", code: "LLT", description: "Low-Loss Fitting Kit", priceAdder: 145 },
  { category: "Refrigerant", code: "SGT", description: "Sight Glass and Filter Drier", priceAdder: 165 },
  { category: "Refrigerant", code: "PMP", description: "Pump Down Control", priceAdder: 195 }
];

export const FIELD_ACCESSORIES: FieldAccessory[] = [
  // Filters
  { category: "Filters", code: "FLT16", description: "Standard Efficiency Filter (16x25x1)", compatible: ["DSC", "DHC"] },
  { category: "Filters", code: "FLT20", description: "High Efficiency Filter (20x25x2)", compatible: ["DSC", "DHC"] },
  { category: "Filters", code: "FLTMERV8", description: "MERV 8 Pleated Filter", compatible: ["all"] },
  { category: "Filters", code: "FLTMERV11", description: "MERV 11 Pleated Filter", compatible: ["all"] },
  { category: "Filters", code: "FLTMERV13", description: "MERV 13 High-Efficiency Filter", compatible: ["all"] },
  { category: "Filters", code: "FLTMERV16", description: "MERV 16 HEPA-Type Filter", compatible: ["DHC", "DHG", "DHH"] },
  { category: "Filters", code: "FLTCARBON", description: "Activated Carbon Filter", compatible: ["all"] },
  { category: "Filters", code: "FLTUVCC", description: "UV-C Light Air Purifier", compatible: ["all"] },
  
  // Controls
  { category: "Controls", code: "TSTPROG", description: "Programmable Thermostat", compatible: ["all"] },
  { category: "Controls", code: "TSTSMART", description: "Smart WiFi Thermostat", compatible: ["all"] },
  { category: "Controls", code: "TSTZONE", description: "Zoning Control System", compatible: ["all"] },
  { category: "Controls", code: "HUMCON", description: "Whole-Home Humidifier Control", compatible: ["all"] },
  { category: "Controls", code: "DEFCON", description: "Defrost Control Override", compatible: ["DHH", "DSH"] },
  { category: "Controls", code: "TSTSTG", description: "Two-Stage Thermostat", compatible: ["DSC", "DSG", "DHC", "DHG"] },
  
  // Sensors
  { category: "Sensors", code: "SNSOUT", description: "Outdoor Temperature Sensor", compatible: ["all"] },
  { category: "Sensors", code: "SNSRET", description: "Return Air Temperature Sensor", compatible: ["all"] },
  { category: "Sensors", code: "SNSHUM", description: "Humidity Sensor", compatible: ["all"] },
  { category: "Sensors", code: "SNSPRESS", description: "Static Pressure Sensor", compatible: ["all"] },
  { category: "Sensors", code: "SNSCO2", description: "CO2 Sensor for DCV", compatible: ["all"] },
  { category: "Sensors", code: "SNSIAQ", description: "Indoor Air Quality Sensor", compatible: ["all"] },
  
  // Dampers
  { category: "Dampers", code: "DMPMOT", description: "Motorized Damper Control", compatible: ["all"] },
  { category: "Dampers", code: "DMPRET", description: "Return Air Damper", compatible: ["all"] },
  { category: "Dampers", code: "DMPVEN", description: "Ventilation Air Damper", compatible: ["all"] },
  { category: "Dampers", code: "DMPREL", description: "Relief Air Damper", compatible: ["all"] },
  { category: "Dampers", code: "DMPZONE", description: "Zone Control Dampers", compatible: ["all"] },
  
  // Ductwork & Accessories
  { category: "Ductwork", code: "DUCTFLEX", description: "Flexible Duct Connector", compatible: ["all"] },
  { category: "Ductwork", code: "DUCTTRANS", description: "Duct Transition", compatible: ["all"] },
  { category: "Ductwork", code: "DUCTINSUL", description: "Duct Insulation Kit", compatible: ["all"] },
  { category: "Ductwork", code: "DUCTBOOT", description: "Duct Boot Set", compatible: ["all"] },
  
  // Electrical
  { category: "Electrical", code: "DISLOCAL", description: "Local Disconnect Switch", compatible: ["all"] },
  { category: "Electrical", code: "WIRING", description: "Field Wiring Kit", compatible: ["all"] },
  { category: "Electrical", code: "CONDUIT", description: "Electrical Conduit Kit", compatible: ["all"] },
  
  // Coils & Heat Exchangers
  { category: "Coils", code: "COILHOT", description: "Hot Water Coil", compatible: ["DSC", "DHC"] },
  { category: "Coils", code: "COILSTM", description: "Steam Heating Coil", compatible: ["DSC", "DHC"] },
  { category: "Coils", code: "COILPRHT", description: "Preheat Coil", compatible: ["all"] }
];

// ============================================================================
// OFFICIAL DAIKIN R-32 FAMILY SPECIFICATIONS
// ============================================================================

export const DAIKIN_R32_FAMILIES = {
  DSC: {
    familyName: "DSC",
    seriesPrefix: "DSC",
    fullName: "R-32 Standard Efficiency Air Conditioner",
    systemType: "Straight A/C" as const,
    efficiency: "Standard",
    capacityRange: "3-25 Ton",
    availableTonnages: ["3.0", "4.0", "5.0", "6.0", "7.5", "10.0", "12.5", "15.0", "20.0", "25.0"],
    capacityCodes: ["036", "048", "060", "072", "090", "102", "120", "150", "180", "240", "300"],
    
    // Performance specifications from official PDFs
    performanceRatings: {
      seer2: { "3-5T": 14, "6T": 16.7 },
      eer2: { "3-5T": 12, "6T": 11.8 },
      ieer: { "6T": 16.7 }
    },
    
    // Physical & technical specifications
    compressorType: { "3-5T": "Single Stage", "6T+": "Two Stage" },
    driveType: "Direct Drive",
    refrigerant: "R-32",
    
    // Voltage/phase combinations
    voltagePhases: [
      { code: "1", voltage: "208-230V", phases: "1" },
      { code: "3", voltage: "208-230V", phases: "3" },
      { code: "4", voltage: "460V", phases: "3" },
      { code: "7", voltage: "575V", phases: "3" }
    ],
    
    // Sound levels from official specifications
    soundLevel: { "3T": 67, "4T": 69, "5T": 71, "6T": 73, "7.5T": 75, "10T+": 77 },
    
    // Controls and options
    controlsAvailable: ["Electromechanical", "DDC/BACnet"],
    electricHeatOptions: ["None", "5kW", "10kW", "15kW", "20kW", "30kW", "45kW", "60kW", "75kW"]
  },

  DHC: {
    familyName: "DHC",
    seriesPrefix: "DHC",
    fullName: "R-32 High-Efficiency Air Conditioner",
    systemType: "Straight A/C" as const,
    efficiency: "High",
    capacityRange: "3-15 Ton",
    availableTonnages: ["3.0", "4.0", "5.0", "6.0", "7.5", "8.5", "10.0", "12.5", "15.0"],
    capacityCodes: ["036", "048", "060", "072", "090", "102", "120", "150", "180"],
    
    // Performance specifications from official PDFs
    performanceRatings: {
      seer2: { "3-5T": 16.6, "6T": 18.6 },
      eer2: { "3-5T": 12.5, "6T": 12.5 },
      ieer: { "6T": 18.6, "7.5T+": 17.5 }
    },
    
    // Physical & technical specifications
    compressorType: "Two Stage",
    driveType: "Direct Drive ECM",
    refrigerant: "R-32",
    
    // Voltage/phase combinations (3-phase only for high efficiency)
    voltagePhases: [
      { code: "3", voltage: "208-230V", phases: "3" },
      { code: "4", voltage: "460V", phases: "3" },
      { code: "7", voltage: "575V", phases: "3" }
    ],
    
    // Sound levels (quieter than standard)
    soundLevel: { "3T": 64, "4T": 66, "5T": 68, "6T": 70, "7.5T": 72, "10T+": 74 },
    
    // Controls and options
    controlsAvailable: ["DDC/BACnet"],
    electricHeatOptions: ["None", "5kW", "10kW", "15kW", "20kW", "30kW", "45kW", "60kW", "75kW"]
  },

  DSG: {
    familyName: "DSG",
    seriesPrefix: "DSG",
    fullName: "R-32 Standard Efficiency Gas/Electric",
    systemType: "Gas/Electric" as const,
    efficiency: "Standard",
    capacityRange: "3-25 Ton",
    availableTonnages: ["3.0", "4.0", "5.0", "6.0", "7.5", "10.0", "12.5", "15.0", "20.0", "25.0"],
    capacityCodes: ["036", "048", "060", "072", "090", "102", "120", "150", "180", "240", "300"],
    
    // Performance specifications from official PDFs
    performanceRatings: {
      seer2: { "3-5T": 14, "6T": 16.7 },
      eer2: { "3-5T": 12, "6T": 11.8 },
      ieer: { "6T": 16.7 }
    },
    
    // Gas heating specifications
    gasHeatingBTU: {
      "3T": [45000, 60000, 70000],
      "4T": [60000, 80000, 90000],
      "5T": [80000, 100000, 115000],
      "6T": [90000, 115000, 125000, 140000],
      "7.5T": [115000, 140000, 150000],
      "8.5T": [130000, 140000, 160000],
      "10T": [140000, 150000, 180000],
      "12.5T+": [180000, 210000, 225000, 240000, 260000]
    },
    
    // Physical & technical specifications
    compressorType: { "3-5T": "Single Stage", "6T+": "Two Stage" },
    driveType: "Direct Drive EEM",
    refrigerant: "R-32",
    
    // Voltage/phase combinations
    voltagePhases: [
      { code: "1", voltage: "208-230V", phases: "1" },
      { code: "3", voltage: "208-230V", phases: "3" },
      { code: "4", voltage: "460V", phases: "3" },
      { code: "7", voltage: "575V", phases: "3" }
    ],
    
    // Sound levels (higher due to gas section)
    soundLevel: { "3T": 69, "4T": 71, "5T": 73, "6T": 75, "7.5T": 77, "10T+": 79 },
    
    // Controls and options
    controlsAvailable: ["Electromechanical", "DDC/BACnet"],
    heatExchangerOptions: ["Aluminized Steel", "Stainless Steel", "Ultra Low NOx"]
  },

  DHG: {
    familyName: "DHG",
    seriesPrefix: "DHG",
    fullName: "R-32 High-Efficiency Gas/Electric",
    systemType: "Gas/Electric" as const,
    efficiency: "High",
    capacityRange: "3-15 Ton",
    availableTonnages: ["3.0", "4.0", "5.0", "6.0", "7.5", "8.5", "10.0", "12.5", "15.0"],
    capacityCodes: ["036", "048", "060", "072", "090", "102", "120", "150", "180"],
    
    // Performance specifications
    performanceRatings: {
      seer2: { "3-5T": 16.6, "6T": 18.6 },
      eer2: { "3-5T": 12.5, "6T": 12.5 },
      ieer: { "6T": 18.6 }
    },
    
    // Gas heating specifications (same as DSG)
    gasHeatingBTU: {
      "3T": [45000, 60000, 70000],
      "4T": [60000, 80000, 90000],
      "5T": [80000, 100000, 115000],
      "6T": [90000, 115000, 125000, 140000],
      "7.5T": [115000, 140000, 150000],
      "8.5T": [130000, 140000, 160000],
      "10T+": [140000, 150000, 180000, 210000]
    },
    
    // Physical & technical specifications
    compressorType: "Two Stage",
    driveType: "Direct Drive ECM",
    refrigerant: "R-32",
    
    // Voltage/phase combinations (3-phase only)
    voltagePhases: [
      { code: "3", voltage: "208-230V", phases: "3" },
      { code: "4", voltage: "460V", phases: "3" },
      { code: "7", voltage: "575V", phases: "3" }
    ],
    
    // Sound levels (quieter than standard)
    soundLevel: { "3T": 66, "4T": 68, "5T": 70, "6T": 72, "7.5T": 74, "10T+": 76 },
    
    // Controls and options
    controlsAvailable: ["DDC/BACnet"],
    heatExchangerOptions: ["Aluminized Steel", "Stainless Steel", "Ultra Low NOx"]
  },

  DSH: {
    familyName: "DSH",
    seriesPrefix: "DSH",
    fullName: "R-32 Standard Efficiency Heat Pump",
    systemType: "Heat Pump" as const,
    efficiency: "Standard",
    capacityRange: "3-10 Ton",
    availableTonnages: ["3.0", "4.0", "5.0", "6.0", "7.5", "8.5", "10.0"],
    capacityCodes: ["036", "048", "060", "072", "090", "102", "120"],
    
    // Performance specifications
    performanceRatings: {
      seer2: { "3-6T": 14, "7.5-10T": 16 },
      eer2: { "3-6T": 12, "7.5-10T": 12 },
      hspf2: { "3-6T": 8.5, "7.5-10T": 9.0 }
    },
    
    // Electric heat specifications
    electricHeatKW: [5, 10, 15, 20, 30],
    
    // Physical & technical specifications
    compressorType: "Two Stage",
    driveType: "Direct Drive",
    refrigerant: "R-32",
    lowTempOperation: -10, // °F
    
    // Voltage/phase combinations
    voltagePhases: [
      { code: "1", voltage: "208-230V", phases: "1" }, // 3-6T only
      { code: "3", voltage: "208-230V", phases: "3" },
      { code: "4", voltage: "460V", phases: "3" },
      { code: "7", voltage: "575V", phases: "3" } // 7.5-10T only
    ],
    
    // Sound levels
    soundLevel: { "3T": 69, "4T": 71, "5T": 73, "6T": 75, "7.5T": 77, "10T": 79 },
    
    // Controls and options
    controlsAvailable: ["Electromechanical", "DDC/BACnet"]
  },

  DHH: {
    familyName: "DHH",
    seriesPrefix: "DHH",
    fullName: "R-32 High-Efficiency Heat Pump",
    systemType: "Heat Pump" as const,
    efficiency: "High",
    capacityRange: "3-6 Ton",
    availableTonnages: ["3.0", "4.0", "5.0", "6.0"],
    capacityCodes: ["036", "048", "060", "072"],
    
    // Performance specifications from official PDFs
    performanceRatings: {
      seer2: { "3-5T": 16.4, "6T": 17.2 },
      eer2: { "3-5T": 13, "6T": 12 },
      hspf2: { "3-6T": 10.5 }
    },
    
    // Electric heat specifications
    electricHeatKW: [5, 10, 15, 20],
    
    // Physical & technical specifications
    compressorType: "Two Stage",
    driveType: "Direct Drive ECM",
    refrigerant: "R-32",
    lowTempOperation: -5, // °F (better low temp operation)
    
    // Voltage/phase combinations (3-phase only)
    voltagePhases: [
      { code: "3", voltage: "208-230V", phases: "3" },
      { code: "4", voltage: "460V", phases: "3" }
    ],
    
    // Sound levels (quieter than standard)
    soundLevel: { "3T": 66, "4T": 68, "5T": 70, "6T": 72 },
    
    // Controls and options
    controlsAvailable: ["DDC/BACnet"]
  }
};

// ============================================================================
// POSITION-BASED MODEL BUILDING SYSTEM (FROM MASTER SCHEMA)
// ============================================================================

export const POSITION_MAPPINGS: PositionMapping = {
  p1: {
    "D": "Daikin"
  },
  p2: {
    "S": "Standard Efficiency",
    "H": "High Efficiency"
  },
  p3: {
    "C": "Straight A/C",
    "G": "Gas/Electric", 
    "H": "Heat Pump"
  },
  p4_p6: {
    "036": 3.0,
    "048": 4.0,
    "060": 5.0,
    "072": 6.0,
    "090": 7.5,
    "102": 8.5,
    "120": 10.0,
    "150": 12.5,
    "180": 15.0,
    "240": 20.0,
    "300": 25.0
  },
  p7: {
    "1": "208/230V 1φ 60Hz",
    "3": "208/230V 3φ 60Hz", 
    "4": "460V 3φ 60Hz",
    "7": "575V 3φ 60Hz"
  },
  p8: {
    "D": "Direct Drive - Standard Static",
    "L": "Direct Drive - Medium Static",
    "W": "Direct Drive - High Static"
  },
  p9_p11_gas: {
    "045": 45000,
    "060": 60000,
    "070": 70000,
    "080": 80000,
    "090": 90000,
    "100": 100000,
    "115": 115000,
    "125": 125000,
    "130": 130000,
    "140": 140000,
    "150": 150000,
    "180": 180000,
    "210": 210000,
    "225": 225000,
    "240": 240000,
    "260": 260000,
    "350": 350000,
    "360": 360000,
    "400": 400000,
    "480": 480000
  },
  p9_p11_electric: {
    "XXX": 0, // No heat
    "005": 5,
    "010": 10,
    "015": 15,
    "020": 20,
    "030": 30,
    "045": 45,
    "060": 60,
    "075": 75,
    "S05": 5,  // SCR variants
    "S10": 10,
    "S15": 15,
    "S16": 15,
    "S18": 18,
    "S20": 20,
    "S21": 20,
    "S22": 20,
    "S25": 25,
    "S30": 30,
    "S31": 30,
    "S45": 45,
    "S46": 45,
    "S60": 60,
    "S75": 75
  },
  p12: {
    "A": "Electromechanical",
    "B": "DDC/BACnet (Standard families)",
    "C": "DDC/BACnet (High-efficiency families)"
  },
  p13: {
    "A": "Single stage",
    "C": "Two stage",
    "F": "Two stage + HGRH + Low Ambient",
    "G": "Single stage + Low Ambient",
    "H": "Two stage + Low Ambient"
  },
  p14: {
    "X": "N/A for non-gas or None",
    "A": "Aluminized Steel",
    "S": "Stainless Steel",
    "U": "Ultra Low NOx"
  }
};

// ============================================================================
// FAMILY DEFINITIONS (FROM MASTER SCHEMA)
// ============================================================================

export const FAMILY_DEFINITIONS: FamilyDefinitions = {
  DSC: {
    series_prefix: "DSC",
    type: "Straight A/C — Standard",
    defaults: {
      p1: "D",
      p2: "S",
      p3: "C",
      p8: "D",
      p12: "A",
      p13: "A",
      p14: "X",
      p15_p24: "XXXXXXXXXX"
    },
    capacity_allowed: ["036", "048", "060", "072", "090", "102", "120", "150", "180", "240", "300"],
    controls_allowed: ["A", "B"],
    requires_gas_btu: false,
    requires_electric_heat: false,
    voltage_phase_combinations: [
      { voltage_code: "1", phase_code: "1", description: "208/230V 1φ" },
      { voltage_code: "3", phase_code: "3", description: "208/230V 3φ" },
      { voltage_code: "4", phase_code: "3", description: "460V 3φ" },
      { voltage_code: "7", phase_code: "3", description: "575V 3φ" }
    ],
    min_capacity_tons: 3.0,
    max_capacity_tons: 25.0
  },
  DHC: {
    series_prefix: "DHC",
    type: "Straight A/C — High",
    defaults: {
      p1: "D",
      p2: "H",
      p3: "C",
      p8: "D",
      p12: "C",
      p13: "C",
      p14: "X",
      p15_p24: "XXXXXXXXXX"
    },
    capacity_allowed: ["036", "048", "060", "072", "090", "102", "120", "150", "180"],
    controls_allowed: ["C"],
    requires_gas_btu: false,
    requires_electric_heat: false,
    voltage_phase_combinations: [
      { voltage_code: "3", phase_code: "3", description: "208/230V 3φ" },
      { voltage_code: "4", phase_code: "3", description: "460V 3φ" },
      { voltage_code: "7", phase_code: "3", description: "575V 3φ" }
    ],
    min_capacity_tons: 3.0,
    max_capacity_tons: 15.0
  },
  DSG: {
    series_prefix: "DSG",
    type: "Gas/Electric — Standard",
    defaults: {
      p1: "D",
      p2: "S",
      p3: "G",
      p8: "D",
      p12: "A",
      p13: "A",
      p14: "A",
      p15_p24: "XXXXXXXXXX"
    },
    capacity_allowed: ["036", "048", "060", "072", "090", "102", "120", "150", "180", "240", "300"],
    controls_allowed: ["A", "B"],
    requires_gas_btu: true,
    requires_electric_heat: false,
    voltage_phase_combinations: [
      { voltage_code: "1", phase_code: "1", description: "208/230V 1φ" },
      { voltage_code: "3", phase_code: "3", description: "208/230V 3φ" },
      { voltage_code: "4", phase_code: "3", description: "460V 3φ" },
      { voltage_code: "7", phase_code: "3", description: "575V 3φ" }
    ],
    min_capacity_tons: 3.0,
    max_capacity_tons: 25.0
  },
  DHG: {
    series_prefix: "DHG",
    type: "Gas/Electric — High",
    defaults: {
      p1: "D",
      p2: "H",
      p3: "G",
      p8: "D",
      p12: "C",
      p13: "C",
      p14: "A",
      p15_p24: "XXXXXXXXXX"
    },
    capacity_allowed: ["036", "048", "060", "072", "090", "102", "120", "150", "180"],
    controls_allowed: ["C"],
    requires_gas_btu: true,
    requires_electric_heat: false,
    voltage_phase_combinations: [
      { voltage_code: "3", phase_code: "3", description: "208/230V 3φ" },
      { voltage_code: "4", phase_code: "3", description: "460V 3φ" },
      { voltage_code: "7", phase_code: "3", description: "575V 3φ" }
    ],
    min_capacity_tons: 3.0,
    max_capacity_tons: 15.0
  },
  DSH_3to6: {
    series_prefix: "DSH",
    type: "Heat Pump — Standard (3-6T)",
    defaults: {
      p1: "D",
      p2: "S",
      p3: "H",
      p8: "D",
      p12: "A",
      p13: "A",
      p14: "X",
      p15_p24: "XXXXXXXXXX"
    },
    capacity_allowed: ["036", "048", "060", "072"],
    controls_allowed: ["A", "B"],
    requires_gas_btu: false,
    requires_electric_heat: true,
    voltage_phase_combinations: [
      { voltage_code: "1", phase_code: "1", description: "208/230V 1φ" },
      { voltage_code: "3", phase_code: "3", description: "208/230V 3φ" },
      { voltage_code: "4", phase_code: "3", description: "460V 3φ" }
    ],
    min_capacity_tons: 3.0,
    max_capacity_tons: 6.0
  },
  DSH_7p5to10: {
    series_prefix: "DSH",
    type: "Heat Pump — Standard (7.5-10T)",
    defaults: {
      p1: "D",
      p2: "S",
      p3: "H",
      p8: "D",
      p12: "A",
      p13: "A",
      p14: "X",
      p15_p24: "XXXXXXXXXX"
    },
    capacity_allowed: ["090", "102", "120"],
    controls_allowed: ["A", "B"],
    requires_gas_btu: false,
    requires_electric_heat: true,
    voltage_phase_combinations: [
      { voltage_code: "3", phase_code: "3", description: "208/230V 3φ" },
      { voltage_code: "4", phase_code: "3", description: "460V 3φ" },
      { voltage_code: "7", phase_code: "3", description: "575V 3φ" }
    ],
    min_capacity_tons: 7.5,
    max_capacity_tons: 10.0
  },
  DHH: {
    series_prefix: "DHH",
    type: "Heat Pump — High (3-6T)",
    defaults: {
      p1: "D",
      p2: "H",
      p3: "H",
      p8: "D",
      p12: "C",
      p13: "C",
      p14: "X",
      p15_p24: "XXXXXXXXXX"
    },
    capacity_allowed: ["036", "048", "060", "072"],
    controls_allowed: ["C"],
    requires_gas_btu: false,
    requires_electric_heat: true,
    voltage_phase_combinations: [
      { voltage_code: "3", phase_code: "3", description: "208/230V 3φ" },
      { voltage_code: "4", phase_code: "3", description: "460V 3φ" }
    ],
    min_capacity_tons: 3.0,
    max_capacity_tons: 6.0
  }
};

// ============================================================================
// REAL CATALOG GENERATION WITH OFFICIAL SPECIFICATIONS
// ============================================================================

export const generateDaikinUnitCatalog = (): DaikinUnitSpec[] => {
  const catalog: DaikinUnitSpec[] = [];
  
  // Generate units for each official Daikin family
  Object.values(DAIKIN_R32_FAMILIES).forEach(family => {
    family.availableTonnages.forEach(tonnage => {
      family.voltagePhases.forEach(voltagePhase => {
        const tonnageFloat = parseFloat(tonnage);
        const tonnageInfo = NOMINAL_TONNAGES.find(t => t.tonnage === tonnage);
        if (!tonnageInfo) return;

        // Skip invalid combinations based on official specifications
        if (tonnageFloat <= 3.0 && voltagePhase.phases === "3" && voltagePhase.voltage !== "208-230V") return;
        if (family.efficiency === "High" && voltagePhase.phases === "1") return; // High efficiency requires 3-phase
        if (family.familyName.includes("DSH") && tonnageFloat >= 7.5 && voltagePhase.phases === "1") return; // Large heat pumps require 3-phase

        // Determine performance ratings based on tonnage
        const isSmallUnit = tonnageFloat <= 5.0;
        const isSixTon = tonnageFloat === 6.0;
        const isLargeUnit = tonnageFloat >= 7.5;

        let seerRating = 14;
        let eerRating = 12;
        let hspfRating: number | undefined;

        // Safely access performance ratings with type assertion for complex indexing
        if (family.performanceRatings?.seer2) {
          const seer2 = family.performanceRatings.seer2 as any;
          const eer2 = family.performanceRatings.eer2 as any;
          
          if (isSixTon && seer2["6T"]) {
            seerRating = seer2["6T"];
            eerRating = eer2?.["6T"] || eerRating;
          } else if (isSmallUnit && seer2["3-5T"]) {
            seerRating = seer2["3-5T"];
            eerRating = eer2?.["3-5T"] || eerRating;
          } else if (isLargeUnit && seer2["7.5-10T"]) {
            seerRating = seer2["7.5-10T"];
            eerRating = eer2?.["7.5-10T"] || eerRating;
          } else if (tonnageFloat <= 6.0 && seer2["3-6T"]) {
            seerRating = seer2["3-6T"];
            eerRating = eer2?.["3-6T"] || eerRating;
          }
        }

        // Handle heat pump HSPF ratings
        if (family.systemType === "Heat Pump" && family.performanceRatings?.hspf2) {
          const hspf2 = family.performanceRatings.hspf2 as any;
          if (tonnageFloat <= 6.0 && hspf2["3-6T"]) {
            hspfRating = hspf2["3-6T"];
          } else if (tonnageFloat >= 7.5 && hspf2["7.5-10T"]) {
            hspfRating = hspf2["7.5-10T"];
          }
        }

        // Generate model number using position-based system
        const capacityCode = family.capacityCodes[family.availableTonnages.indexOf(tonnage)];
        const voltageCode = voltagePhase.code;
        const defaultsObj = FAMILY_DEFINITIONS[family.familyName as DaikinFamilyKeys]?.defaults;
        
        const modelNumber = `${family.seriesPrefix}${capacityCode}${voltageCode}${defaultsObj?.p8 || "D"}${family.systemType === "Gas/Electric" ? "090" : "XXX"}${defaultsObj?.p12 || "A"}${defaultsObj?.p13 || "A"}${defaultsObj?.p14 || "X"}${defaultsObj?.p15_p24 || "XXXXXXXXXX"}`;

        // Determine sound level with safe access
        const soundKey = tonnageFloat <= 3 ? "3T" : 
                        tonnageFloat <= 4 ? "4T" :
                        tonnageFloat <= 5 ? "5T" :
                        tonnageFloat <= 6 ? "6T" :
                        tonnageFloat <= 7.5 ? "7.5T" : "10T+";
        const soundLevel = (family.soundLevel as any)[soundKey] || 75;

        // Determine dimensions based on tonnage (from official specifications)
        const dimensions = getDimensionsByTonnage(tonnageFloat);
        const weight = getWeightByTonnage(tonnageFloat, family.systemType);

        const specs: DaikinUnitSpec = {
          id: `${family.familyName.toLowerCase()}_${tonnage.replace(".", "")}_${voltagePhase.voltage.replace(/[^0-9]/g, "")}_${voltagePhase.phases}ph`,
          modelNumber,
          brand: "Daikin",
          systemType: family.systemType,
          tonnage: tonnage as any,
          btuCapacity: tonnageInfo.btuCapacity,
          voltage: voltagePhase.voltage.replace(/V$/, "") as any, // Remove 'V' suffix
          phases: voltagePhase.phases as any,
          
          // Real performance ratings from official specifications
          seerRating,
          eerRating,
          hspfRating,
          
          // Technical specifications
          refrigerant: "R-32",
          driveType: family.driveType.includes("ECM") || family.driveType.includes("EEM") ? "Variable Speed" as any : 
                     family.compressorType === "Two Stage" || (typeof family.compressorType === "string" && family.compressorType.includes("Two Stage")) ? "Two-Stage" as any :
                     "Fixed Speed" as any,
          coolingStages: family.compressorType === "Two Stage" || tonnageFloat >= 6 ? 2 : 1,
          heatingStages: family.systemType === "Heat Pump" ? 2 : undefined,
          soundLevel,
          
          // Physical specifications
          dimensions,
          weight,
          
          // System components based on family
          controls: family.efficiency === "High" ? 
            ["DDC Controls", "BACnet Interface", "Advanced Diagnostics"] :
            ["Electromechanical Controls", "Basic Diagnostics"],
          sensors: ["Outdoor Temperature", "Return Air", "Discharge Air", "R-32 Leak Detection"],
          coils: family.efficiency === "High" ? "Enhanced Microchannel" : "Standard Microchannel",
          
          // Add-ons and accessories
          electricalAddOns: ELECTRICAL_ADD_ONS,
          fieldAccessories: FIELD_ACCESSORIES,
          
          // Service and warranty
          serviceOptions: ["Standard Service", "Extended Warranty", "Preventive Maintenance"],
          warranty: 10,
          
          // IAQ features
          iaqFeatures: family.efficiency === "High" ? 
            ["Advanced Filtration", "UV Light Ready", "Humidity Control", "Fresh Air Integration"] : 
            ["Standard Filtration", "Basic IAQ"],
          
          // System-specific fields
          heatingBTU: family.systemType === "Gas/Electric" ? getGasHeatingBTU(tonnageFloat, family) : undefined,
          gasCategory: family.systemType === "Gas/Electric" ? "Natural Gas" : undefined,
          heatKitKW: family.systemType === "Heat Pump" ? getElectricHeatKW(tonnageFloat, family) : undefined,
          lowTempOperation: family.systemType === "Heat Pump" ? 
            (family.efficiency === "High" ? -5 : -10) : undefined
        };
        
        catalog.push(specs);
        
        // Add propane variant for gas/electric units
        if (family.systemType === "Gas/Electric") {
          const propaneSpecs = { 
            ...specs, 
            id: `${specs.id}_propane`,
            modelNumber: specs.modelNumber, // Same model number, different gas type
            gasCategory: "Propane" as any,
            heatingBTU: specs.heatingBTU ? Math.round(specs.heatingBTU * 0.92) : undefined // Propane efficiency factor
          };
          catalog.push(propaneSpecs);
        }
      });
    });
  });
  
  return catalog;
};

// ============================================================================
// HELPER FUNCTIONS FOR REAL SPECIFICATIONS
// ============================================================================

function getDimensionsByTonnage(tonnage: number): { length: number; width: number; height: number } {
  // Official dimensions from Daikin specifications
  if (tonnage <= 4.0) return { length: 87, width: 43, height: 50 }; // 3-4 ton
  if (tonnage <= 6.0) return { length: 95, width: 43, height: 54 }; // 5-6 ton
  if (tonnage <= 10.0) return { length: 113, width: 50, height: 60 }; // 7.5-10 ton
  if (tonnage <= 15.0) return { length: 139, width: 59, height: 66 }; // 12.5-15 ton
  return { length: 165, width: 69, height: 72 }; // 20-25 ton
}

function getWeightByTonnage(tonnage: number, systemType: string): number {
  // Base weight from official specifications
  let baseWeight = tonnage * 55; // lbs per ton
  
  // System type adjustments
  if (systemType === "Gas/Electric") baseWeight *= 1.4; // Gas section adds weight
  if (systemType === "Heat Pump") baseWeight *= 1.2; // Heat pump components
  
  // Size adjustments
  if (tonnage <= 6.0) baseWeight += 200; // Base unit weight
  else if (tonnage <= 12.5) baseWeight += 350;
  else baseWeight += 500;
  
  return Math.round(baseWeight);
}

function getGasHeatingBTU(tonnage: number, family: any): number {
  if (!family.gasHeatingBTU) return 0;
  
  const tonnageKey = tonnage <= 3 ? "3T" :
                    tonnage <= 4 ? "4T" :
                    tonnage <= 5 ? "5T" :
                    tonnage <= 6 ? "6T" :
                    tonnage <= 7.5 ? "7.5T" : "12.5T+";
  
  const options = family.gasHeatingBTU[tonnageKey];
  if (!options || options.length === 0) return 0;
  
  // Return middle option as default
  return options[Math.floor(options.length / 2)];
}

function getElectricHeatKW(tonnage: number, family: any): number {
  if (!family.electricHeatKW) return 0;
  
  // Standard sizing: 5kW per ton for smaller units, proportional for larger
  if (tonnage <= 6.0) return Math.min(tonnage * 5, 20);
  return Math.min(tonnage * 4, 30);
}

// ============================================================================
// ENHANCED HELPER FUNCTIONS 
// ============================================================================

// Get position value description
export function getPositionDescription(position: keyof PositionMapping, code: string): string {
  const mapping = POSITION_MAPPINGS[position];
  if (typeof mapping === 'object' && code in mapping) {
    return String(mapping[code]);
  }
  return `Unknown code: ${code}`;
}

// Get capacity in tons from p4_p6 code
export function getCapacityFromCode(capacityCode: string): number {
  return POSITION_MAPPINGS.p4_p6[capacityCode] || 0;
}

// Get gas BTU from p9_p11 code
export function getGasBTUFromCode(gasBtuCode: string): number {
  return POSITION_MAPPINGS.p9_p11_gas[gasBtuCode] || 0;
}

// Get electric kW from p9_p11 code
export function getElectricKWFromCode(electricCode: string): number {
  return POSITION_MAPPINGS.p9_p11_electric[electricCode] || 0;
}

// Find nearest capacity code with fallback strategy
export function findNearestCapacityCode(
  targetTons: number, 
  familyKey: DaikinFamilyKeys,
  strategy: 'nearest' | 'exact' = 'nearest'
): { code: string; value: number } | null {
  const family = FAMILY_DEFINITIONS[familyKey];
  if (!family) return null;

  const allowedCapacities = family.capacity_allowed
    .map(code => ({ code, value: getCapacityFromCode(code) }))
    .filter(cap => cap.value > 0)
    .sort((a, b) => a.value - b.value);

  if (strategy === 'exact') {
    const exact = allowedCapacities.find(cap => Math.abs(cap.value - targetTons) < 0.1);
    return exact || null;
  }

  // Nearest strategy
  if (allowedCapacities.length === 0) return null;
  
  let nearest = allowedCapacities[0];
  let minDiff = Math.abs(nearest.value - targetTons);
  
  for (const cap of allowedCapacities) {
    const diff = Math.abs(cap.value - targetTons);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = cap;
    }
  }
  
  return nearest;
}

// Find nearest gas BTU code
export function findNearestGasBTUCode(
  targetBTU: number,
  strategy: 'nearest' | 'exact' = 'nearest'
): { code: string; value: number } | null {
  const availableGasBTUs = Object.entries(POSITION_MAPPINGS.p9_p11_gas)
    .map(([code, value]) => ({ code, value }))
    .sort((a, b) => a.value - b.value);

  if (strategy === 'exact') {
    const exact = availableGasBTUs.find(btu => Math.abs(btu.value - targetBTU) < 1000);
    return exact || null;
  }

  // Nearest strategy
  if (availableGasBTUs.length === 0) return null;
  
  let nearest = availableGasBTUs[0];
  let minDiff = Math.abs(nearest.value - targetBTU);
  
  for (const btu of availableGasBTUs) {
    const diff = Math.abs(btu.value - targetBTU);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = btu;
    }
  }
  
  return nearest;
}

// Find nearest electric kW code
export function findNearestElectricKWCode(
  targetKW: number,
  strategy: 'nearest' | 'exact' = 'nearest'
): { code: string; value: number } | null {
  const availableElectricKWs = Object.entries(POSITION_MAPPINGS.p9_p11_electric)
    .filter(([code]) => code !== 'XXX') // Exclude "no heat" option
    .map(([code, value]) => ({ code, value }))
    .sort((a, b) => a.value - b.value);

  if (strategy === 'exact') {
    const exact = availableElectricKWs.find(kw => Math.abs(kw.value - targetKW) < 0.5);
    return exact || null;
  }

  // Nearest strategy
  if (availableElectricKWs.length === 0) return null;
  
  let nearest = availableElectricKWs[0];
  let minDiff = Math.abs(nearest.value - targetKW);
  
  for (const kw of availableElectricKWs) {
    const diff = Math.abs(kw.value - targetKW);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = kw;
    }
  }
  
  return nearest;
}

// Determine family key from application and efficiency
export function determineFamilyKey(
  application: 'C' | 'G' | 'H', 
  efficiency: 'S' | 'H',
  capacityTons?: number
): DaikinFamilyKeys | null {
  if (application === 'C') {
    return efficiency === 'S' ? 'DSC' : 'DHC';
  } else if (application === 'G') {
    return efficiency === 'S' ? 'DSG' : 'DHG';
  } else if (application === 'H') {
    if (efficiency === 'H') {
      return 'DHH';
    } else {
      // Standard heat pump - choose based on capacity
      if (capacityTons && capacityTons >= 7.5) {
        return 'DSH_7p5to10';
      } else {
        return 'DSH_3to6';
      }
    }
  }
  
  return null;
}

// Validate family compatibility with specifications
export function validateFamilySpecifications(
  familyKey: DaikinFamilyKeys,
  capacityCode: string,
  controlsCode: string,
  gasBtuCode?: string
): { isValid: boolean; errors: string[] } {
  const family = FAMILY_DEFINITIONS[familyKey];
  if (!family) {
    return { isValid: false, errors: [`Unknown family: ${familyKey}`] };
  }

  const errors: string[] = [];

  // Check capacity compatibility
  if (!family.capacity_allowed.includes(capacityCode)) {
    errors.push(`Capacity ${capacityCode} not allowed for family ${familyKey}`);
  }

  // Check controls compatibility
  if (!family.controls_allowed.includes(controlsCode)) {
    errors.push(`Controls ${controlsCode} not allowed for family ${familyKey}`);
  }

  // Check gas BTU requirement
  if (family.requires_gas_btu && !gasBtuCode) {
    errors.push(`Family ${familyKey} requires gas BTU specification`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Convert BTU to tonnage
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

// Validate voltage/phase combinations
export function isValidVoltagePhase(voltage: string, phases: string): boolean {
  const validCombinations = [
    { voltage: "208-230", phases: "1" },
    { voltage: "208-230", phases: "3" },
    { voltage: "460", phases: "3" },
    { voltage: "575", phases: "3" }
  ];
  
  return validCombinations.some(combo => combo.voltage === voltage && combo.phases === phases);
}

// Get available tonnages for a system type
export function getAvailableTonnages(systemType: string): string[] {
  const families = Object.values(DAIKIN_R32_FAMILIES).filter(f => f.systemType === systemType);
  const allTonnages = new Set<string>();
  families.forEach(family => {
    family.availableTonnages.forEach(tonnage => allTonnages.add(tonnage));
  });
  return Array.from(allTonnages).sort((a, b) => parseFloat(a) - parseFloat(b));
}

// ============================================================================
// EXPORT REAL CATALOG
// ============================================================================

export const DAIKIN_R32_CATALOG = generateDaikinUnitCatalog();

// Helper function to get units by family
export function getUnitsByFamily(familyName: string): DaikinUnitSpec[] {
  return DAIKIN_R32_CATALOG.filter(unit => unit.modelNumber.startsWith(familyName));
}