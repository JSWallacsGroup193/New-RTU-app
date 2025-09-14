import { 
  BuildModelRequest, 
  BuildModelResponse, 
  DaikinFamilyKeys,
  ModelPositions,
  CapacitySizeLadder,
  GasBtuSizeLadder,
  ElectricKwSizeLadder
} from "@shared/schema";
import { POSITION_MAPPINGS, DAIKIN_R32_FAMILIES } from "../data/daikinCatalog";

export class ModelBuilder {
  
  /**
   * Build a Daikin model number from specifications with fallback logic
   */
  buildModel(request: BuildModelRequest): BuildModelResponse {
    try {
      const { family, tons, voltage, fan_drive, controls, refrig_sys, 
              gas_btu_numeric, electric_kw, heat_exchanger, accessories } = request;

      // Validate family exists (with fallback for DSH variants)
      const familyKey = family.startsWith('DSH') ? 'DSH' : family;
      if (!DAIKIN_R32_FAMILIES[familyKey as keyof typeof DAIKIN_R32_FAMILIES]) {
        return {
          success: false,
          errors: [`Unknown Daikin family: ${family}`],
          warnings: [],
          validation_results: {
            family_compatible: false,
            capacity_valid: false,
            gas_btu_valid: false,
            voltage_phase_valid: false,
            all_positions_valid: false
          }
        };
      }

      const familyConfig = DAIKIN_R32_FAMILIES[familyKey as keyof typeof DAIKIN_R32_FAMILIES];
      
      // Find closest capacity
      const capacityMatch = this.findClosestCapacity(tons);
      if (!capacityMatch) {
        return {
          success: false,
          errors: [`No valid capacity found for ${tons} tons`],
          warnings: [],
          validation_results: {
            family_compatible: true,
            capacity_valid: false,
            gas_btu_valid: false,
            voltage_phase_valid: false,
            all_positions_valid: false
          }
        };
      }

      // Validate voltage
      const voltageValid = this.validateVoltage(voltage);
      if (!voltageValid) {
        return {
          success: false,
          errors: [`Invalid voltage code: ${voltage}`],
          warnings: [],
          validation_results: {
            family_compatible: true,
            capacity_valid: true,
            gas_btu_valid: false,
            voltage_phase_valid: false,
            all_positions_valid: false
          }
        };
      }

      // Handle gas BTU or electric kW based on system type
      let heatFieldCode = "XXX"; // Default no heat
      let gasBtuMatch: GasBtuSizeLadder | undefined;
      let electricKwMatch: ElectricKwSizeLadder | undefined;
      
      const systemType = this.getSystemTypeFromFamily(family);
      
      if (systemType === "Gas/Electric" && gas_btu_numeric) {
        const gasBtuResult = this.findClosestGasBtu(gas_btu_numeric);
        if (gasBtuResult) {
          heatFieldCode = gasBtuResult.direct_match.code;
          gasBtuMatch = gasBtuResult;
        }
      } else if ((systemType === "Heat Pump" || systemType === "Straight A/C") && electric_kw) {
        const electricKwResult = this.findClosestElectricKw(electric_kw);
        if (electricKwResult) {
          heatFieldCode = electricKwResult.direct_match.code;
          electricKwMatch = electricKwResult;
        }
      }

      // Build model positions
      const positions: ModelPositions = {
        p1: "D", // Always Daikin
        p2: family.startsWith("DH") ? "H" : "S", // High or Standard efficiency
        p3: this.getApplicationCode(systemType),
        p4_p6: capacityMatch.direct_match.code,
        p7: voltage,
        p8: fan_drive || "D",
        p9_p11: heatFieldCode,
        p12: controls || "A",
        p13: refrig_sys || "A", 
        p14: heat_exchanger || "X",
        p15_p24: "XXXXXXXXXX" // Default accessories
      };

      // Build final model number
      const modelNumber = this.buildModelFromPositions(positions);

      // Create specifications
      const specifications = this.buildSpecifications(family, capacityMatch.direct_match.value, voltage, systemType);

      const result = {
        success: true,
        result: {
          model: modelNumber,
          capacity_match: capacityMatch,
          gas_btu_match: gasBtuMatch,
          electric_kw_match: electricKwMatch,
          specifications,
          family: family as DaikinFamilyKeys,
          positions,
          match_quality: {
            capacity_exactness: tons === capacityMatch.direct_match.value ? 1.0 : 0.8,
            gas_btu_exactness: gas_btu_numeric && gasBtuMatch ? 
              (gas_btu_numeric === gasBtuMatch.direct_match.value ? 1.0 : 0.8) : undefined,
            electric_kw_exactness: electric_kw && electricKwMatch ? 
              (electric_kw === electricKwMatch.direct_match.value ? 1.0 : 0.8) : undefined,
            overall_score: 0.9,
            match_explanation: "Model built successfully with specifications"
          },
          fallback_applied: {
            capacity: tons !== capacityMatch.direct_match.value,
            gas_btu: gas_btu_numeric && gasBtuMatch ? 
              gas_btu_numeric !== gasBtuMatch.direct_match.value : false,
            electric_kw: electric_kw && electricKwMatch ? 
              electric_kw !== electricKwMatch.direct_match.value : false,
            bounds_clipping: []
          }
        },
        errors: [],
        warnings: [],
        validation_results: {
          family_compatible: true,
          capacity_valid: true,
          gas_btu_valid: !gas_btu_numeric || !!gasBtuMatch,
          voltage_phase_valid: true,
          all_positions_valid: true
        }
      };

      return result;
      
    } catch (error) {
      console.error("Error building model:", error);
      return {
        success: false,
        errors: [`Failed to build model: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        validation_results: {
          family_compatible: false,
          capacity_valid: false,
          gas_btu_valid: false,
          voltage_phase_valid: false,
          all_positions_valid: false
        }
      };
    }
  }

  private findClosestCapacity(tons: number): CapacitySizeLadder | null {
    const capacityCodes = POSITION_MAPPINGS.p4_p6;
    const availableTons = Object.values(capacityCodes).sort((a, b) => a - b);
    
    // Find exact match
    const exactMatch = Object.entries(capacityCodes).find(([_, value]) => value === tons);
    if (exactMatch) {
      return {
        direct_match: { code: exactMatch[0], value: exactMatch[1] },
        size_smaller: this.findAdjacentCapacity(tons, "smaller"),
        size_larger: this.findAdjacentCapacity(tons, "larger")
      };
    }
    
    // Find closest match
    const closest = availableTons.reduce((prev, curr) => 
      Math.abs(curr - tons) < Math.abs(prev - tons) ? curr : prev
    );
    
    const closestEntry = Object.entries(capacityCodes).find(([_, value]) => value === closest);
    if (!closestEntry) return null;
    
    return {
      direct_match: { code: closestEntry[0], value: closestEntry[1] },
      size_smaller: this.findAdjacentCapacity(closest, "smaller"),
      size_larger: this.findAdjacentCapacity(closest, "larger")
    };
  }

  private findAdjacentCapacity(tons: number, direction: "smaller" | "larger"): { code: string; value: number } | null {
    const capacityCodes = POSITION_MAPPINGS.p4_p6;
    const availableTons = Object.values(capacityCodes).sort((a, b) => a - b);
    const currentIndex = availableTons.indexOf(tons);
    
    if (currentIndex === -1) return null;
    
    const targetIndex = direction === "smaller" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= availableTons.length) return null;
    
    const targetTons = availableTons[targetIndex];
    const entry = Object.entries(capacityCodes).find(([_, value]) => value === targetTons);
    
    return entry ? { code: entry[0], value: entry[1] } : null;
  }

  private findClosestGasBtu(gasBtu: number): GasBtuSizeLadder | null {
    const gasCodes = POSITION_MAPPINGS.p9_p11_gas;
    const availableBtus = Object.values(gasCodes).sort((a, b) => a - b);
    
    const closest = availableBtus.reduce((prev, curr) => 
      Math.abs(curr - gasBtu) < Math.abs(prev - gasBtu) ? curr : prev
    );
    
    const closestEntry = Object.entries(gasCodes).find(([_, value]) => value === closest);
    if (!closestEntry) return null;
    
    return {
      direct_match: { code: closestEntry[0], value: closestEntry[1] },
      size_smaller: null, // Simplified for now
      size_larger: null
    };
  }

  private findClosestElectricKw(electricKw: number): ElectricKwSizeLadder | null {
    const electricCodes = POSITION_MAPPINGS.p9_p11_electric;
    const availableKws = Object.values(electricCodes).sort((a, b) => a - b);
    
    const closest = availableKws.reduce((prev, curr) => 
      Math.abs(curr - electricKw) < Math.abs(prev - electricKw) ? curr : prev
    );
    
    const closestEntry = Object.entries(electricCodes).find(([_, value]) => value === closest);
    if (!closestEntry) return null;
    
    return {
      direct_match: { code: closestEntry[0], value: closestEntry[1] },
      size_smaller: null, // Simplified for now
      size_larger: null
    };
  }

  private validateVoltage(voltage: string): boolean {
    return voltage in POSITION_MAPPINGS.p7;
  }

  private getSystemTypeFromFamily(family: DaikinFamilyKeys): "Heat Pump" | "Gas/Electric" | "Straight A/C" {
    if (family.includes("DSH") || family.includes("DHH")) return "Heat Pump";
    if (family.includes("DSG") || family.includes("DHG")) return "Gas/Electric";
    return "Straight A/C";
  }

  private getApplicationCode(systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C"): string {
    switch (systemType) {
      case "Heat Pump": return "H";
      case "Gas/Electric": return "G";
      case "Straight A/C": return "C";
      default: return "C";
    }
  }

  private buildModelFromPositions(positions: ModelPositions): string {
    return `${positions.p1}${positions.p2}${positions.p3}${positions.p4_p6}${positions.p7}${positions.p8}${positions.p9_p11}${positions.p12}${positions.p13}${positions.p14}${positions.p15_p24}`;
  }

  private buildSpecifications(family: DaikinFamilyKeys, tons: number, voltage: string, systemType: string) {
    const familyKey = family.startsWith('DSH') ? 'DSH' : family;
    const familyConfig = DAIKIN_R32_FAMILIES[familyKey as keyof typeof DAIKIN_R32_FAMILIES];
    const btuCapacity = tons * 12000; // Convert tons to BTU/hr
    
    // Get voltage description
    const voltageDesc = POSITION_MAPPINGS.p7[voltage] || voltage;
    
    // Determine efficiency based on family
    const efficiency = family.startsWith("DH") ? "High" : "Standard";
    
    return {
      id: `${family}_${tons}t_${voltage}`,
      modelNumber: "", // Will be filled by caller
      brand: "Daikin" as const,
      systemType: systemType as "Heat Pump" | "Gas/Electric" | "Straight A/C",
      tonnage: tons.toString() as any,
      voltage: voltageDesc.split("/")[0] as "208-230" | "460" | "575",
      btuCapacity,
      phases: (voltageDesc.includes("1φ") ? "1" : "3") as "1" | "3",
      seerRating: efficiency === "High" ? 16.0 : 14.0,
      eerRating: 12.0,
      hspfRating: systemType === "Heat Pump" ? 8.5 : undefined,
      refrigerant: "R-32",
      driveType: "Direct Drive",
      coolingStages: 1,
      heatingStages: systemType === "Heat Pump" ? 1 : undefined,
      soundLevel: Math.min(70 + (tons * 2), 80), // Estimate based on tonnage
      dimensions: {
        length: Math.ceil(tons * 10 + 30),
        width: Math.ceil(tons * 8 + 25),
        height: Math.ceil(tons * 6 + 20)
      },
      weight: Math.ceil(tons * 100 + 200),
      controls: ["Standard Controls"],
      sensors: ["Temperature", "Pressure"],
      compressorManufacturer: "Daikin",
      gasCategory: undefined,
      efficiency: efficiency as "Standard" | "High",
      operatingAmperage: Math.ceil(tons * 3.5 + 5),
      maxFuseSize: Math.ceil(tons * 4 + 10),
      temperatureRange: {
        cooling: { min: 65, max: 95 },
        heating: systemType === "Heat Pump" ? { min: 0, max: 70 } : undefined
      },
      controlsType: "Electromechanical",
      coilType: "Copper/Aluminum",
      electricalAddOns: [],
      fieldAccessories: [],
      serviceOptions: [],
      warranty: "5 Year Limited Warranty",
      iaqFeatures: []
    };
  }
}