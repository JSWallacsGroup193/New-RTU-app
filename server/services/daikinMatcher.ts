import type {
  ParsedModel,
  Replacement,
  EnhancedReplacement,
  DaikinUnitSpec,
  SpecSearchInput,
  BTUToTonnageConversion,
  SizingMatch,
  SystemType,
  Tonnage,
  VoltageEnum,
  PhaseEnum,
  GasCategory,
  Efficiency
} from "@shared/schema";
import {
  DAIKIN_R32_CATALOG,
  NOMINAL_TONNAGES,
  btuToTonnage,
  isValidVoltagePhase,
  getAvailableTonnages
} from "../data/daikinCatalog";

// ============================================================================
// SMART SIZING LOGIC TYPES
// ============================================================================

interface MatchingOptions {
  systemType?: SystemType;
  efficiency?: Efficiency;
  voltage?: VoltageEnum;
  phases?: PhaseEnum;
  gasCategory?: GasCategory;
  targetCapacity: number;
  tolerance?: number; // Percentage tolerance for direct matches (default 10%)
}

interface SizingResult {
  directMatch: DaikinUnitSpec | null;
  smallerAlternative: DaikinUnitSpec | null;
  largerAlternative: DaikinUnitSpec | null;
  sizingAnalysis: BTUToTonnageConversion;
}

interface MatchScore {
  unit: DaikinUnitSpec;
  score: number;
  matchType: "direct" | "smaller" | "larger";
  sizingRatio: number;
}

export class DaikinMatcher {
  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Find Daikin replacements for a parsed original unit
   */
  public findReplacements(originalUnit: ParsedModel): Replacement[] {
    try {
      const matchingOptions: MatchingOptions = {
        targetCapacity: originalUnit.btuCapacity,
        tolerance: 0.10 // 10% tolerance for direct matches
      };

      // Get sizing analysis for the original unit
      const sizingAnalysis = this.analyzeBTUToTonnage(originalUnit.btuCapacity);
      
      // Find matches for each system type with smart ordering
      const systemTypes: SystemType[] = ["Heat Pump", "Gas/Electric", "Straight A/C"];
      const allReplacements: Replacement[] = [];

      for (const systemType of systemTypes) {
        const systemOptions = { ...matchingOptions, systemType };
        const sizingResult = this.findOptimalSizing(systemOptions);
        
        // Add direct match
        if (sizingResult.directMatch) {
          allReplacements.push(this.createLegacyReplacement(sizingResult.directMatch, "direct"));
        }
        
        // Add alternatives
        if (sizingResult.smallerAlternative) {
          allReplacements.push(this.createLegacyReplacement(sizingResult.smallerAlternative, "smaller"));
        }
        
        if (sizingResult.largerAlternative) {
          allReplacements.push(this.createLegacyReplacement(sizingResult.largerAlternative, "larger"));
        }
      }

      // Sort by system type preference and capacity proximity
      return this.sortReplacementsByPreference(allReplacements, originalUnit.btuCapacity);
      
    } catch (error) {
      console.error("Error finding replacements:", error);
      return [];
    }
  }

  /**
   * Enhanced replacement search with comprehensive specs
   */
  public findEnhancedReplacements(originalUnit: ParsedModel): EnhancedReplacement[] {
    try {
      const matchingOptions: MatchingOptions = {
        targetCapacity: originalUnit.btuCapacity,
        tolerance: 0.10
      };

      const sizingAnalysis = this.analyzeBTUToTonnage(originalUnit.btuCapacity);
      const systemTypes: SystemType[] = ["Heat Pump", "Gas/Electric", "Straight A/C"];
      const enhancedReplacements: EnhancedReplacement[] = [];

      for (const systemType of systemTypes) {
        const systemOptions = { ...matchingOptions, systemType };
        const sizingResult = this.findOptimalSizing(systemOptions);
        
        // Convert to enhanced replacements with comprehensive specs
        if (sizingResult.directMatch) {
          enhancedReplacements.push(this.createEnhancedReplacement(sizingResult.directMatch, "direct", originalUnit.btuCapacity));
        }
        
        if (sizingResult.smallerAlternative) {
          enhancedReplacements.push(this.createEnhancedReplacement(sizingResult.smallerAlternative, "smaller", originalUnit.btuCapacity));
        }
        
        if (sizingResult.largerAlternative) {
          enhancedReplacements.push(this.createEnhancedReplacement(sizingResult.largerAlternative, "larger", originalUnit.btuCapacity));
        }
      }

      return this.sortEnhancedReplacementsByNomenclature(enhancedReplacements);
      
    } catch (error) {
      console.error("Error finding enhanced replacements:", error);
      return [];
    }
  }

  /**
   * Search by specifications with comprehensive filtering
   */
  public searchBySpecs(
    btuMin: number,
    btuMax: number,
    systemType?: SystemType,
    voltage?: string
  ): DaikinUnitSpec[] {
    try {
      return DAIKIN_R32_CATALOG.filter(unit => {
        const capacityMatch = unit.btuCapacity >= btuMin && unit.btuCapacity <= btuMax;
        const systemMatch = !systemType || unit.systemType === systemType;
        const voltageMatch = !voltage || unit.voltage === voltage;
        
        return capacityMatch && systemMatch && voltageMatch;
      }).sort((a, b) => {
        // Sort by system type, then by capacity
        if (a.systemType !== b.systemType) {
          const systemOrder = { "Heat Pump": 1, "Gas/Electric": 2, "Straight A/C": 3 };
          return (systemOrder[a.systemType] || 4) - (systemOrder[b.systemType] || 4);
        }
        return a.btuCapacity - b.btuCapacity;
      });
      
    } catch (error) {
      console.error("Error searching by specs:", error);
      return [];
    }
  }

  /**
   * Advanced specification search with SpecSearchInput
   */
  public searchBySpecInput(input: SpecSearchInput): DaikinUnitSpec[] {
    try {
      const targetTonnage = NOMINAL_TONNAGES.find(t => t.tonnage === input.tonnage);
      if (!targetTonnage) {
        throw new Error(`Invalid tonnage: ${input.tonnage}`);
      }

      return DAIKIN_R32_CATALOG.filter(unit => {
        // Core matching criteria
        const systemMatch = unit.systemType === input.systemType;
        const tonnageMatch = unit.tonnage === input.tonnage;
        const voltageMatch = unit.voltage === input.voltage;
        const phaseMatch = unit.phases === input.phases;
        
        // Efficiency filtering
        const efficiencyMatch = input.efficiency === "standard" ? 
          unit.seerRating <= 17 : unit.seerRating >= 20;
        
        // Gas category for Gas/Electric systems
        const gasCategoryMatch = input.systemType === "Gas/Electric" ? 
          unit.gasCategory === input.gasCategory : true;
        
        // Optional performance filters
        const seerMatch = !input.minSEER || unit.seerRating >= input.minSEER;
        const soundMatch = !input.maxSoundLevel || unit.soundLevel <= input.maxSoundLevel;
        const refrigerantMatch = !input.refrigerant || unit.refrigerant === input.refrigerant;
        const driveTypeMatch = !input.driveType || unit.driveType === input.driveType;
        
        return systemMatch && tonnageMatch && voltageMatch && phaseMatch && 
               efficiencyMatch && gasCategoryMatch && seerMatch && 
               soundMatch && refrigerantMatch && driveTypeMatch;
      }).sort((a, b) => {
        // Sort by efficiency preference, then model number
        if (a.seerRating !== b.seerRating) {
          return input.efficiency === "high" ? b.seerRating - a.seerRating : a.seerRating - b.seerRating;
        }
        return a.modelNumber.localeCompare(b.modelNumber);
      });
      
    } catch (error) {
      console.error("Error searching by spec input:", error);
      return [];
    }
  }

  // ============================================================================
  // SMART SIZING LOGIC
  // ============================================================================

  /**
   * Find optimal sizing with direct match and alternatives
   */
  private findOptimalSizing(options: MatchingOptions): SizingResult {
    const { targetCapacity, systemType, efficiency, voltage, phases, gasCategory } = options;
    
    // Get tonnage conversion analysis
    const sizingAnalysis = this.analyzeBTUToTonnage(targetCapacity);
    
    // Filter catalog by system type and other criteria
    let candidateUnits = DAIKIN_R32_CATALOG.filter(unit => {
      const systemMatch = !systemType || unit.systemType === systemType;
      const efficiencyMatch = !efficiency || 
        (efficiency === "standard" ? unit.seerRating <= 17 : unit.seerRating >= 20);
      const voltageMatch = !voltage || unit.voltage === voltage;
      const phaseMatch = !phases || unit.phases === phases;
      const gasMatch = !gasCategory || unit.gasCategory === gasCategory;
      
      return systemMatch && efficiencyMatch && voltageMatch && phaseMatch && gasMatch;
    });

    // Find direct match (within nominal capacity range)
    const directMatch = this.findDirectMatch(candidateUnits, targetCapacity, sizingAnalysis);
    
    // Find alternatives within the same product family if direct match exists
    let smallerAlternative: DaikinUnitSpec | null = null;
    let largerAlternative: DaikinUnitSpec | null = null;
    
    if (directMatch) {
      const familyUnits = candidateUnits.filter(unit => 
        this.isSameProductFamily(unit, directMatch)
      );
      
      smallerAlternative = this.findSmallerAlternative(familyUnits, directMatch);
      largerAlternative = this.findLargerAlternative(familyUnits, directMatch);
    } else {
      // If no direct match, find nearest available size
      const nearestMatch = this.findNearestMatch(candidateUnits, targetCapacity);
      if (nearestMatch) {
        // Use nearest as direct match and find alternatives
        const familyUnits = candidateUnits.filter(unit => 
          this.isSameProductFamily(unit, nearestMatch)
        );
        
        return {
          directMatch: nearestMatch,
          smallerAlternative: this.findSmallerAlternative(familyUnits, nearestMatch),
          largerAlternative: this.findLargerAlternative(familyUnits, nearestMatch),
          sizingAnalysis
        };
      }
    }
    
    return {
      directMatch,
      smallerAlternative,
      largerAlternative,
      sizingAnalysis
    };
  }

  /**
   * Analyze BTU to tonnage conversion with recommendations
   */
  private analyzeBTUToTonnage(btuCapacity: number): BTUToTonnageConversion {
    const { tonnage, exactTonnage } = btuToTonnage(btuCapacity, true);
    
    const recommendedSizes = NOMINAL_TONNAGES.map(nominalTonnage => {
      const percentDifference = Math.abs(btuCapacity - nominalTonnage.btuCapacity) / btuCapacity * 100;
      const matchType = btuCapacity < nominalTonnage.minBTU ? "larger" :
                       btuCapacity > nominalTonnage.maxBTU ? "smaller" : "direct";
      
      return {
        tonnage: nominalTonnage.tonnage,
        matchType: matchType as "smaller" | "direct" | "larger",
        percentDifference,
        recommended: percentDifference <= 15 // Recommend if within 15%
      };
    }).sort((a, b) => a.percentDifference - b.percentDifference);
    
    return {
      btuCapacity,
      exactTonnage,
      nearestStandardTonnage: tonnage as Tonnage,
      sizingDifference: Math.abs(exactTonnage - parseFloat(tonnage)) / exactTonnage * 100,
      recommendedSizes
    };
  }

  /**
   * Find direct match within nominal capacity range
   */
  private findDirectMatch(
    candidateUnits: DaikinUnitSpec[], 
    targetCapacity: number, 
    sizingAnalysis: BTUToTonnageConversion
  ): DaikinUnitSpec | null {
    // First try to find exact tonnage match
    const exactTonnageMatches = candidateUnits.filter(unit => 
      unit.tonnage === sizingAnalysis.nearestStandardTonnage
    );
    
    if (exactTonnageMatches.length > 0) {
      // Sort by efficiency preference (high efficiency first, then standard)
      return exactTonnageMatches.sort((a, b) => b.seerRating - a.seerRating)[0];
    }
    
    // If no exact tonnage match, find within tolerance
    const tolerance = targetCapacity * 0.10; // 10% tolerance
    const toleranceMatches = candidateUnits.filter(unit => 
      Math.abs(unit.btuCapacity - targetCapacity) <= tolerance
    );
    
    if (toleranceMatches.length > 0) {
      return toleranceMatches.sort((a, b) => {
        const aDiff = Math.abs(a.btuCapacity - targetCapacity);
        const bDiff = Math.abs(b.btuCapacity - targetCapacity);
        return aDiff - bDiff;
      })[0];
    }
    
    return null;
  }

  /**
   * Find nearest available match if no direct match
   */
  private findNearestMatch(candidateUnits: DaikinUnitSpec[], targetCapacity: number): DaikinUnitSpec | null {
    if (candidateUnits.length === 0) return null;
    
    return candidateUnits.sort((a, b) => {
      const aDiff = Math.abs(a.btuCapacity - targetCapacity);
      const bDiff = Math.abs(b.btuCapacity - targetCapacity);
      
      // Prefer smaller if equal distance (tie goes to smaller)
      if (aDiff === bDiff) {
        return a.btuCapacity - b.btuCapacity;
      }
      
      return aDiff - bDiff;
    })[0];
  }

  /**
   * Find smaller alternative within same product family
   */
  private findSmallerAlternative(familyUnits: DaikinUnitSpec[], baseUnit: DaikinUnitSpec): DaikinUnitSpec | null {
    const smallerUnits = familyUnits.filter(unit => 
      parseFloat(unit.tonnage) < parseFloat(baseUnit.tonnage)
    );
    
    if (smallerUnits.length === 0) return null;
    
    // Return the largest among smaller units (one size down)
    return smallerUnits.sort((a, b) => parseFloat(b.tonnage) - parseFloat(a.tonnage))[0];
  }

  /**
   * Find larger alternative within same product family
   */
  private findLargerAlternative(familyUnits: DaikinUnitSpec[], baseUnit: DaikinUnitSpec): DaikinUnitSpec | null {
    const largerUnits = familyUnits.filter(unit => 
      parseFloat(unit.tonnage) > parseFloat(baseUnit.tonnage)
    );
    
    if (largerUnits.length === 0) return null;
    
    // Return the smallest among larger units (one size up)
    return largerUnits.sort((a, b) => parseFloat(a.tonnage) - parseFloat(b.tonnage))[0];
  }

  /**
   * Check if two units are from the same product family
   */
  private isSameProductFamily(unit1: DaikinUnitSpec, unit2: DaikinUnitSpec): boolean {
    // Extract family code from model number (e.g., "DZ17SA" from "DZ17SA0361A")
    const getFamily = (modelNumber: string) => {
      const match = modelNumber.match(/^([A-Z]{2}\d{2}[A-Z]{2})/);
      return match ? match[1] : modelNumber.substring(0, 6);
    };
    
    const family1 = getFamily(unit1.modelNumber);
    const family2 = getFamily(unit2.modelNumber);
    
    return family1 === family2 && unit1.voltage === unit2.voltage && unit1.phases === unit2.phases;
  }

  // ============================================================================
  // CONVERSION AND SORTING UTILITIES
  // ============================================================================

  /**
   * Create legacy replacement for backward compatibility
   */
  private createLegacyReplacement(unit: DaikinUnitSpec, sizeMatch: "smaller" | "direct" | "larger"): Replacement {
    return {
      id: unit.id,
      modelNumber: unit.modelNumber,
      systemType: unit.systemType,
      btuCapacity: unit.btuCapacity,
      voltage: unit.voltage,
      phases: unit.phases,
      specifications: this.convertToLegacySpecs(unit),
      sizeMatch
    };
  }

  /**
   * Create enhanced replacement with comprehensive specs
   */
  private createEnhancedReplacement(
    unit: DaikinUnitSpec, 
    sizeMatch: "smaller" | "direct" | "larger",
    originalCapacity: number
  ): EnhancedReplacement {
    const sizingRatio = unit.btuCapacity / originalCapacity;
    
    return {
      id: unit.id,
      modelNumber: unit.modelNumber,
      brand: "Daikin",
      systemType: unit.systemType,
      tonnage: unit.tonnage,
      btuCapacity: unit.btuCapacity,
      voltage: unit.voltage,
      phases: unit.phases,
      
      // Performance ratings
      seerRating: unit.seerRating,
      eerRating: unit.eerRating,
      hspfRating: unit.hspfRating,
      refrigerant: unit.refrigerant,
      driveType: unit.driveType,
      coolingStages: unit.coolingStages,
      heatingStages: unit.heatingStages,
      soundLevel: unit.soundLevel,
      
      dimensions: unit.dimensions,
      weight: unit.weight,
      
      // Smart sizing match
      sizeMatch,
      sizingRatio,
      
      // Available options
      electricalAddOns: unit.electricalAddOns,
      fieldAccessories: unit.fieldAccessories,
      
      // Computed values
      computedModelString: unit.modelNumber,
      alternativeModels: this.generateAlternativeModels(unit),
      
      // Legacy compatibility
      specifications: this.convertToLegacySpecs(unit)
    };
  }

  /**
   * Convert comprehensive specs to legacy format
   */
  private convertToLegacySpecs(unit: DaikinUnitSpec): Array<{label: string; value: string; unit?: string}> {
    const specs = [
      { label: "SEER Rating", value: unit.seerRating.toString() },
      { label: "Refrigerant", value: unit.refrigerant },
      { label: "Sound Level", value: unit.soundLevel.toString(), unit: "dB" },
      { label: "Dimensions", value: `${unit.dimensions.length} x ${unit.dimensions.width} x ${unit.dimensions.height}`, unit: "in" },
      { label: "Weight", value: unit.weight.toString(), unit: "lbs" },
      { label: "Warranty", value: unit.warranty.toString(), unit: "years" }
    ];
    
    if (unit.eerRating) {
      specs.push({ label: "EER Rating", value: unit.eerRating.toString() });
    }
    
    if (unit.hspfRating) {
      specs.push({ label: "HSPF Rating", value: unit.hspfRating.toString() });
    }
    
    if (unit.heatingBTU) {
      specs.push({ label: "Heating Capacity", value: unit.heatingBTU.toString(), unit: "BTU/h" });
    }
    
    if (unit.heatKitKW) {
      specs.push({ label: "Heat Kit", value: unit.heatKitKW.toString(), unit: "kW" });
    }
    
    return specs;
  }

  /**
   * Generate alternative model numbers for the same capacity/specs
   */
  private generateAlternativeModels(unit: DaikinUnitSpec): string[] {
    // Find units with same tonnage and system type but different efficiency or voltage
    const alternatives = DAIKIN_R32_CATALOG.filter(altUnit => 
      altUnit.id !== unit.id &&
      altUnit.systemType === unit.systemType &&
      altUnit.tonnage === unit.tonnage &&
      (altUnit.voltage !== unit.voltage || altUnit.seerRating !== unit.seerRating)
    );
    
    return alternatives.map(alt => alt.modelNumber).slice(0, 3); // Limit to 3 alternatives
  }

  /**
   * Sort replacements by preference (system type and capacity proximity)
   */
  private sortReplacementsByPreference(replacements: Replacement[], originalCapacity: number): Replacement[] {
    return replacements.sort((a, b) => {
      // First sort by system type preference
      const systemOrder = { "Heat Pump": 1, "Gas/Electric": 2, "Straight A/C": 3 };
      const systemDiff = (systemOrder[a.systemType] || 4) - (systemOrder[b.systemType] || 4);
      if (systemDiff !== 0) return systemDiff;
      
      // Then by match type preference
      const matchOrder = { "direct": 1, "smaller": 2, "larger": 3 };
      const matchDiff = (matchOrder[a.sizeMatch] || 4) - (matchOrder[b.sizeMatch] || 4);
      if (matchDiff !== 0) return matchDiff;
      
      // Finally by capacity proximity
      const aProximity = Math.abs(a.btuCapacity - originalCapacity);
      const bProximity = Math.abs(b.btuCapacity - originalCapacity);
      return aProximity - bProximity;
    });
  }

  /**
   * Sort enhanced replacements by Daikin nomenclature
   */
  private sortEnhancedReplacementsByNomenclature(replacements: EnhancedReplacement[]): EnhancedReplacement[] {
    return replacements.sort((a, b) => {
      // Sort by system type, then efficiency, then capacity
      const systemOrder = { "Heat Pump": 1, "Gas/Electric": 2, "Straight A/C": 3 };
      const systemDiff = (systemOrder[a.systemType] || 4) - (systemOrder[b.systemType] || 4);
      if (systemDiff !== 0) return systemDiff;
      
      // High efficiency first
      const efficiencyDiff = b.seerRating - a.seerRating;
      if (Math.abs(efficiencyDiff) > 2) return efficiencyDiff;
      
      // Then by capacity
      return a.btuCapacity - b.btuCapacity;
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get available tonnages for a specific system type
   */
  public getAvailableTonnagesForSystem(systemType: SystemType): Tonnage[] {
    return getAvailableTonnages(systemType) as Tonnage[];
  }

  /**
   * Validate voltage/phase combination
   */
  public validateVoltagePhase(voltage: VoltageEnum, phases: PhaseEnum): boolean {
    return isValidVoltagePhase(voltage, phases);
  }

  /**
   * Convert BTU to tonnage with analysis
   */
  public convertBTUToTonnage(btuCapacity: number): BTUToTonnageConversion {
    return this.analyzeBTUToTonnage(btuCapacity);
  }

  /**
   * Get unit specifications by model number
   */
  public getUnitByModelNumber(modelNumber: string): DaikinUnitSpec | null {
    return DAIKIN_R32_CATALOG.find(unit => 
      unit.modelNumber.toUpperCase() === modelNumber.toUpperCase()
    ) || null;
  }

  /**
   * Get units by product family
   */
  public getUnitsByFamily(familyName: string): DaikinUnitSpec[] {
    return DAIKIN_R32_CATALOG.filter(unit => 
      unit.modelNumber.toUpperCase().startsWith(familyName.toUpperCase())
    );
  }
}