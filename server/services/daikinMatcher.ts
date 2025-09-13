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
  Efficiency,
  ModelPositions,
  FallbackStrategy,
  CapacitySizeLadder,
  GasBtuSizeLadder,
  ElectricKwSizeLadder,
  DaikinFamilyKeys,
  EnhancedReplacementResult,
  BuildModelRequest,
  BuildModelResponse,
  ParseModelRequest,
  ParseModelResponse,
  AdvancedMatchingRequest,
  AdvancedMatchingResponse,
  FamilyValidationRequest,
  FamilyValidationResponse,
  PositionMapping,
  FamilyDefinitions
} from "@shared/schema";
import {
  DAIKIN_R32_CATALOG,
  NOMINAL_TONNAGES,
  btuToTonnage,
  isValidVoltagePhase,
  getAvailableTonnages,
  POSITION_MAPPINGS,
  FAMILY_DEFINITIONS,
  getPositionDescription,
  getCapacityFromCode,
  getGasBTUFromCode,
  getElectricKWFromCode,
  findNearestCapacityCode,
  findNearestGasBTUCode,
  findNearestElectricKWCode,
  determineFamilyKey,
  validateFamilySpecifications
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
  // ENHANCED MATHEMATICAL FALLBACK LOGIC
  // ============================================================================

  /**
   * Generate size ladder for any numeric value with neighbors
   */
  private generateSizeLadder<T extends number>(
    directMatch: { code: string; value: T },
    availableValues: Record<string, T>,
    includeZero: boolean = false
  ): { 
    direct_match: { code: string; value: T };
    size_smaller: { code: string; value: T } | null;
    size_larger: { code: string; value: T } | null;
  } {
    // Convert to sorted entries, excluding zero if requested
    const sortedEntries = Object.entries(availableValues)
      .filter(([code, value]) => includeZero || value > 0)
      .map(([code, value]) => ({ code, value: value as T }))
      .sort((a, b) => a.value - b.value);

    const directIndex = sortedEntries.findIndex(entry => entry.value === directMatch.value);
    
    return {
      direct_match: directMatch,
      size_smaller: directIndex > 0 ? sortedEntries[directIndex - 1] : null,
      size_larger: directIndex < sortedEntries.length - 1 ? sortedEntries[directIndex + 1] : null
    };
  }

  /**
   * Find nearest match with comprehensive fallback strategy
   */
  private findNearestMatchWithFallback<T extends number>(
    targetValue: T,
    availableValues: Record<string, T>,
    strategy: FallbackStrategy = {
      selection_strategy: "nearest",
      tie_breaker: "round_half_up_to_higher",
      bounds_strategy: "clip_to_min_max"
    }
  ): { code: string; value: T } | null {
    const entries = Object.entries(availableValues)
      .filter(([, value]) => value > 0)
      .map(([code, value]) => ({ code, value: value as T }))
      .sort((a, b) => a.value - b.value);

    if (entries.length === 0) return null;

    // Handle bounds
    if (targetValue < entries[0].value) {
      if (strategy.bounds_strategy === "error_on_bounds") return null;
      return entries[0]; // Clip to minimum
    }
    if (targetValue > entries[entries.length - 1].value) {
      if (strategy.bounds_strategy === "error_on_bounds") return null;
      return entries[entries.length - 1]; // Clip to maximum
    }

    if (strategy.selection_strategy === "exact") {
      return entries.find(entry => Math.abs(entry.value - targetValue) < 0.1) || null;
    }

    // Nearest strategy with tie-breaker
    let bestMatch = entries[0];
    let minDistance = Math.abs(entries[0].value - targetValue);
    const tiedMatches: typeof entries = [];

    for (const entry of entries) {
      const distance = Math.abs(entry.value - targetValue);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = entry;
        tiedMatches.length = 0; // Clear ties
        tiedMatches.push(entry);
      } else if (distance === minDistance) {
        tiedMatches.push(entry);
      }
    }

    // Handle ties
    if (tiedMatches.length > 1) {
      if (strategy.tie_breaker === "round_half_up_to_higher") {
        return tiedMatches.reduce((prev, current) => 
          current.value > prev.value ? current : prev
        );
      } else {
        return tiedMatches.reduce((prev, current) => 
          current.value < prev.value ? current : prev
        );
      }
    }

    return bestMatch;
  }

  // ============================================================================
  // POSITION-BASED MODEL BUILDING
  // ============================================================================

  /**
   * Build Daikin model from specifications with mathematical fallback
   */
  public buildModelWithFallback(request: BuildModelRequest): BuildModelResponse {
    try {
      const family = FAMILY_DEFINITIONS[request.family];
      if (!family) {
        return {
          success: false,
          errors: [`Unknown family: ${request.family}`],
          warnings: [],
          validation_results: {
            family_compatible: false,
            capacity_valid: false,
            voltage_phase_valid: false,
            all_positions_valid: false
          }
        };
      }

      const warnings: string[] = [];
      const fallbackApplied = {
        capacity: false,
        gas_btu: false,
        electric_kw: false,
        bounds_clipping: [] as string[]
      };

      // Find capacity match with fallback
      const capacityMatch = findNearestCapacityCode(
        request.tons,
        request.family
      );
      
      if (!capacityMatch) {
        return {
          success: false,
          errors: [`No valid capacity found for ${request.tons} tons in family ${request.family}`],
          warnings,
          validation_results: {
            family_compatible: true,
            capacity_valid: false,
            voltage_phase_valid: false,
            all_positions_valid: false
          }
        };
      }

      if (Math.abs(capacityMatch.value - request.tons) > 0.1) {
        fallbackApplied.capacity = true;
        warnings.push(`Capacity adjusted from ${request.tons}T to ${capacityMatch.value}T`);
      }

      // Generate capacity size ladder
      const capacityLadder = this.generateSizeLadder(
        capacityMatch,
        POSITION_MAPPINGS.p4_p6
      );

      // Handle gas BTU matching for gas families
      let gasBtuLadder: GasBtuSizeLadder | undefined;
      if (request.gas_btu_numeric && family.requires_gas_btu) {
        const gasBtuMatch = findNearestGasBTUCode(
          request.gas_btu_numeric,
          request.fallback_strategy?.selection_strategy || "nearest"
        );
        
        if (gasBtuMatch) {
          if (Math.abs(gasBtuMatch.value - request.gas_btu_numeric) > 1000) {
            fallbackApplied.gas_btu = true;
            warnings.push(`Gas BTU adjusted from ${request.gas_btu_numeric} to ${gasBtuMatch.value}`);
          }
          gasBtuLadder = this.generateSizeLadder(
            gasBtuMatch,
            POSITION_MAPPINGS.p9_p11_gas
          );
        }
      }

      // Handle electric kW matching for heat pump families
      let electricKwLadder: ElectricKwSizeLadder | undefined;
      if (request.electric_kw && family.requires_electric_heat) {
        const electricKwMatch = findNearestElectricKWCode(
          request.electric_kw,
          request.fallback_strategy?.selection_strategy || "nearest"
        );
        
        if (electricKwMatch) {
          if (Math.abs(electricKwMatch.value - request.electric_kw) > 0.5) {
            fallbackApplied.electric_kw = true;
            warnings.push(`Electric kW adjusted from ${request.electric_kw} to ${electricKwMatch.value}`);
          }
          electricKwLadder = this.generateSizeLadder(
            electricKwMatch,
            POSITION_MAPPINGS.p9_p11_electric
          );
        }
      }

      // Build positions
      const positions: ModelPositions = {
        ...family.defaults,
        p4_p6: capacityMatch.code,
        p7: this.getVoltageCode(request.voltage),
        p8: request.fan_drive || "D",
        p9_p11: this.getHeatFieldCode(request.gas_btu_numeric, request.electric_kw, family),
        p12: request.controls || "A",
        p13: request.refrig_sys || "A",
        p14: request.heat_exchanger || "X",
        p15_p24: "XXXXXXXXXX"
      } as ModelPositions;

      // Validate family specifications
      const validation = validateFamilySpecifications(
        request.family,
        positions.p4_p6,
        positions.p12,
        gasBtuLadder?.direct_match.code
      );

      // Build model string
      const modelNumber = this.buildModelFromPositions(positions);

      // Create specifications
      const specifications = this.createSpecificationsFromPositions(positions, request.family);

      // Calculate match quality
      const matchQuality = {
        capacity_exactness: 1 - Math.abs(capacityMatch.value - request.tons) / request.tons,
        gas_btu_exactness: gasBtuLadder ? 
          1 - Math.abs(gasBtuLadder.direct_match.value - (request.gas_btu_numeric || 0)) / (request.gas_btu_numeric || 1) : 
          undefined,
        electric_kw_exactness: electricKwLadder ?
          1 - Math.abs(electricKwLadder.direct_match.value - (request.electric_kw || 0)) / (request.electric_kw || 1) :
          undefined,
        overall_score: 0.8 + (fallbackApplied.capacity ? -0.2 : 0) + (fallbackApplied.gas_btu ? -0.1 : 0),
        match_explanation: this.generateMatchExplanation(fallbackApplied, warnings)
      };

      const result: EnhancedReplacementResult = {
        model: modelNumber,
        capacity_match: capacityLadder,
        gas_btu_match: gasBtuLadder,
        electric_kw_match: electricKwLadder,
        specifications,
        family: request.family,
        positions,
        match_quality: matchQuality,
        fallback_applied: fallbackApplied
      };

      return {
        success: true,
        result,
        warnings,
        errors: validation.errors,
        validation_results: {
          family_compatible: true,
          capacity_valid: validation.isValid,
          gas_btu_valid: !family.requires_gas_btu || !!gasBtuLadder,
          voltage_phase_valid: true,
          all_positions_valid: validation.isValid
        }
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Build error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        validation_results: {
          family_compatible: false,
          capacity_valid: false,
          voltage_phase_valid: false,
          all_positions_valid: false
        }
      };
    }
  }

  /**
   * Parse existing model number into positions
   */
  public parseModelToPositions(request: ParseModelRequest): ParseModelResponse {
    try {
      const modelNumber = request.model_number.toUpperCase();
      
      if (modelNumber.length < 14) {
        return {
          success: false,
          validation_errors: ["Model number too short - minimum 14 characters required"]
        };
      }

      // Parse positions from model number
      const positions: ModelPositions = {
        p1: modelNumber.substring(0, 1),
        p2: modelNumber.substring(1, 2),
        p3: modelNumber.substring(2, 3),
        p4_p6: modelNumber.substring(3, 6),
        p7: modelNumber.substring(6, 7),
        p8: modelNumber.substring(7, 8),
        p9_p11: modelNumber.substring(8, 11),
        p12: modelNumber.substring(11, 12),
        p13: modelNumber.substring(12, 13),
        p14: modelNumber.substring(13, 14),
        p15_p24: modelNumber.length > 14 ? modelNumber.substring(14) : "XXXXXXXXXX"
      };

      // Determine family from positions
      const family = determineFamilyKey(
        positions.p3 as 'C' | 'G' | 'H',
        positions.p2 as 'S' | 'H',
        getCapacityFromCode(positions.p4_p6)
      );

      // Parse values
      const parsedValues = {
        brand: getPositionDescription('p1', positions.p1),
        tier: getPositionDescription('p2', positions.p2),
        application: getPositionDescription('p3', positions.p3),
        capacity_tons: getCapacityFromCode(positions.p4_p6),
        voltage_description: getPositionDescription('p7', positions.p7),
        gas_btu: positions.p3 === 'G' ? getGasBTUFromCode(positions.p9_p11) : undefined,
        electric_kw: positions.p3 === 'H' ? getElectricKWFromCode(positions.p9_p11) : undefined
      };

      // Validation if requested
      const validationErrors: string[] = [];
      if (request.validate && family) {
        const validation = validateFamilySpecifications(
          family,
          positions.p4_p6,
          positions.p12,
          positions.p3 === 'G' ? positions.p9_p11 : undefined
        );
        validationErrors.push(...validation.errors);
      }

      return {
        success: true,
        positions,
        family: family || undefined,
        parsed_values: parsedValues,
        validation_errors: validationErrors
      };

    } catch (error) {
      return {
        success: false,
        validation_errors: [`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Advanced matching with multiple strategies
   */
  public advancedMatching(request: AdvancedMatchingRequest): AdvancedMatchingResponse {
    try {
      const results: EnhancedReplacementResult[] = [];
      let exactMatches = 0;
      let fallbackMatches = 0;
      let totalLaddersGenerated = 0;

      // Determine families to search
      const familiesToSearch = request.preferred_families || 
        Object.keys(FAMILY_DEFINITIONS) as DaikinFamilyKeys[];

      for (const familyKey of familiesToSearch) {
        const family = FAMILY_DEFINITIONS[familyKey];
        if (!family) continue;

        // Build model request for this family
        const buildRequest: BuildModelRequest = {
          family: familyKey,
          tons: request.original_capacity / 12000, // Convert BTU to tons
          voltage: request.voltage_preference?.[0] || "208-230",
          controls: "A",
          fan_drive: "D",
          refrig_sys: "A",
          heat_exchanger: "X",
          accessories: {},
          gas_btu_numeric: request.original_gas_btu,
          electric_kw: request.original_electric_kw,
          fallback_strategy: request.fallback_strategy
        };

        const buildResponse = this.buildModelWithFallback(buildRequest);
        
        if (buildResponse.success && buildResponse.result) {
          results.push(buildResponse.result);
          
          if (buildResponse.result.fallback_applied.capacity ||
              buildResponse.result.fallback_applied.gas_btu ||
              buildResponse.result.fallback_applied.electric_kw) {
            fallbackMatches++;
          } else {
            exactMatches++;
          }

          if (request.include_size_ladders) {
            totalLaddersGenerated++;
            if (buildResponse.result.gas_btu_match) totalLaddersGenerated++;
            if (buildResponse.result.electric_kw_match) totalLaddersGenerated++;
          }
        }
      }

      // Sort results by match quality
      results.sort((a, b) => b.match_quality.overall_score - a.match_quality.overall_score);
      
      // Limit results
      const limitedResults = results.slice(0, request.max_results);

      return {
        matches: limitedResults,
        matching_summary: {
          total_matches: results.length,
          exact_matches: exactMatches,
          fallback_matches: fallbackMatches,
          families_searched: familiesToSearch,
          best_match_score: results.length > 0 ? results[0].match_quality.overall_score : 0
        },
        size_analysis: request.include_size_ladders ? {
          original_tonnage_exact: request.original_capacity / 12000,
          nearest_standard_tonnage: this.findNearestStandardTonnage(request.original_capacity / 12000),
          capacity_ladders_generated: limitedResults.length,
          gas_btu_ladders_generated: limitedResults.filter(r => r.gas_btu_match).length,
          electric_kw_ladders_generated: limitedResults.filter(r => r.electric_kw_match).length
        } : undefined
      };

    } catch (error) {
      return {
        matches: [],
        matching_summary: {
          total_matches: 0,
          exact_matches: 0,
          fallback_matches: 0,
          families_searched: [],
          best_match_score: 0
        }
      };
    }
  }

  // ============================================================================
  // HELPER METHODS FOR POSITION-BASED OPERATIONS
  // ============================================================================

  private buildModelFromPositions(positions: ModelPositions): string {
    return `${positions.p1}${positions.p2}${positions.p3}${positions.p4_p6}${positions.p7}${positions.p8}${positions.p9_p11}${positions.p12}${positions.p13}${positions.p14}${positions.p15_p24}`;
  }

  private getVoltageCode(voltage: string): string {
    const voltageMap: Record<string, string> = {
      "208-230": "1", "208/230": "1", "230": "1",
      "460": "4", "575": "7"
    };
    return voltageMap[voltage] || "1";
  }

  private getHeatFieldCode(gasBtu?: number, electricKw?: number, family?: any): string {
    if (gasBtu && family?.requires_gas_btu) {
      const gasMatch = findNearestGasBTUCode(gasBtu);
      return gasMatch?.code || "XXX";
    }
    if (electricKw && family?.requires_electric_heat) {
      const electricMatch = findNearestElectricKWCode(electricKw);
      return electricMatch?.code || "XXX";
    }
    return "XXX";
  }

  private createSpecificationsFromPositions(
    positions: ModelPositions, 
    family: DaikinFamilyKeys
  ): DaikinUnitSpec {
    const capacity = getCapacityFromCode(positions.p4_p6);
    const familyConfig = FAMILY_DEFINITIONS[family];
    
    if (!familyConfig) {
      throw new Error(`Unknown family configuration: ${family}`);
    }
    
    return {
      id: `${family}-${positions.p4_p6}`,
      modelNumber: this.buildModelFromPositions(positions),
      brand: "Daikin" as const,
      systemType: familyConfig.type.includes("A/C") ? "Straight A/C" : 
                   familyConfig.type.includes("Gas") ? "Gas/Electric" : "Heat Pump",
      tonnage: capacity.toString() as Tonnage,
      btuCapacity: capacity * 12000,
      voltage: getPositionDescription('p7', positions.p7) as VoltageEnum,
      phases: positions.p7 === "1" ? "1" : "3" as PhaseEnum,
      seerRating: familyConfig.type.includes("High") ? 18 : 16,
      refrigerant: "R-32" as const,
      driveType: "Variable Speed" as const,
      coolingStages: 1,
      soundLevel: 65,
      dimensions: { length: 48, width: 48, height: 72 },
      weight: 300 + (capacity * 50),
      controls: [getPositionDescription('p12', positions.p12)],
      sensors: ["Temperature", "Pressure"],
      electricalAddOns: [],
      fieldAccessories: [],
      serviceOptions: [],
      iaqFeatures: [],
      warranty: 10
    };
  }

  private generateMatchExplanation(
    fallbackApplied: { capacity: boolean; gas_btu?: boolean; electric_kw?: boolean },
    warnings: string[]
  ): string {
    if (!fallbackApplied.capacity && !fallbackApplied.gas_btu && !fallbackApplied.electric_kw) {
      return "Exact match found for all specifications";
    }
    return `Fallback matching applied: ${warnings.join("; ")}`;
  }

  private findNearestStandardTonnage(tons: number): Tonnage {
    const standardTonnages = NOMINAL_TONNAGES.map(t => parseFloat(t.tonnage));
    let nearest = standardTonnages[0];
    let minDiff = Math.abs(nearest - tons);
    
    for (const tonnage of standardTonnages) {
      const diff = Math.abs(tonnage - tons);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = tonnage;
      }
    }
    
    return nearest.toString() as Tonnage;
  }

  // ============================================================================
  // STRICT EXACT-MATCH LOGIC METHODS
  // ============================================================================

  /**
   * Strict exact match validation for all criteria
   * Returns null if not exact match, no fallbacks
   */
  public strictExactMatch(unit: DaikinUnitSpec, criteria: SpecSearchInput): boolean {
    // Exact system type match
    if (unit.systemType !== criteria.systemType) return false;
    
    // Exact tonnage match
    if (unit.tonnage !== criteria.tonnage) return false;
    
    // Exact voltage match
    if (unit.voltage !== criteria.voltage) return false;
    
    // Exact phases match
    if (unit.phases !== criteria.phases) return false;
    
    // Efficiency level exact match (based on SEER rating)
    const isHighEfficiency = unit.seerRating >= 18;
    const expectedHighEfficiency = criteria.efficiency === "high";
    if (isHighEfficiency !== expectedHighEfficiency) return false;
    
    // Conditional exact matches based on system type
    if (criteria.systemType === "Gas/Electric") {
      // For Gas/Electric systems, heatingBTU must match exactly
      if (!criteria.heatingBTU) return false; // Required field
      if (!unit.heatingBTU || Math.abs(unit.heatingBTU - criteria.heatingBTU) > 1) return false;
      
      // Gas category must match if specified
      if (criteria.gasCategory && unit.gasCategory !== criteria.gasCategory) return false;
    }
    
    if (criteria.systemType === "Heat Pump" && criteria.heatKitKW) {
      // For Heat Pumps with heat kit, must match exactly
      if (!unit.heatKitKW || Math.abs(unit.heatKitKW - criteria.heatKitKW) > 0.1) return false;
    }
    
    // Optional strict filters
    if (criteria.maxSoundLevel && unit.soundLevel > criteria.maxSoundLevel) return false;
    if (criteria.refrigerant && unit.refrigerant !== criteria.refrigerant) return false;
    if (criteria.driveType && unit.driveType !== criteria.driveType) return false;
    
    return true;
  }

  /**
   * Find strict exact match replacements for parsed model
   * No tolerance, no fallbacks for "direct" replacements
   */
  public findStrictReplacements(
    originalUnit: ParsedModel, 
    efficiencyPreference?: { preferredLevel?: "standard" | "high"; energySavings?: boolean; }
  ): { direct: Replacement | null; alternatives: Replacement[] } {
    try {
      // Convert parsed model to search criteria
      const baseCriteria: Partial<SpecSearchInput> = {
        tonnage: this.findNearestStandardTonnage(originalUnit.btuCapacity / 12000),
        voltage: this.mapVoltageToEnum(originalUnit.voltage),
        phases: originalUnit.phases as PhaseEnum,
        efficiency: efficiencyPreference?.preferredLevel || "standard"
      };

      const systemTypes: SystemType[] = ["Heat Pump", "Gas/Electric", "Straight A/C"];
      let directReplacement: Replacement | null = null;
      const alternatives: Replacement[] = [];

      for (const systemType of systemTypes) {
        const searchCriteria: SpecSearchInput = {
          systemType,
          ...baseCriteria,
          // Set conditional fields based on system type
          ...(systemType === "Gas/Electric" && originalUnit.heatingBTU ? {
            heatingBTU: originalUnit.heatingBTU,
            gasCategory: originalUnit.gasCategory || "Natural Gas"
          } : {}),
          ...(systemType === "Heat Pump" && originalUnit.heatKitKW ? {
            heatKitKW: originalUnit.heatKitKW
          } : {})
        } as SpecSearchInput;

        // Find exact matches only
        const exactMatches = DAIKIN_R32_CATALOG.filter(unit => 
          this.strictExactMatch(unit, searchCriteria)
        );

        if (exactMatches.length > 0 && !directReplacement) {
          // Take first exact match as direct replacement
          directReplacement = this.createLegacyReplacement(exactMatches[0], "direct");
        }

        // Add all other exact matches as alternatives
        for (const match of exactMatches.slice(1)) {
          alternatives.push(this.createLegacyReplacement(match, "alternative"));
        }
      }

      return { direct: directReplacement, alternatives };
      
    } catch (error) {
      console.error("Error finding strict replacements:", error);
      return { direct: null, alternatives: [] };
    }
  }

  /**
   * Search with strict exact matching and return structured results
   * Neighbors are constrained to ±1 tonnage variations within the same family as direct matches
   */
  public searchWithStrictMatching(searchInput: SpecSearchInput): {
    direct: DaikinUnitSpec[];
    neighbors: { smaller: DaikinUnitSpec[]; larger: DaikinUnitSpec[]; };
  } {
    try {
      // Find exact matches
      const exactMatches = DAIKIN_R32_CATALOG.filter(unit => 
        this.strictExactMatch(unit, searchInput)
      );

      // If no direct matches, return empty neighbors
      if (exactMatches.length === 0) {
        return {
          direct: [],
          neighbors: { smaller: [], larger: [] }
        };
      }

      // Get unique families from direct matches to constrain neighbors
      const directMatchFamilies = new Set(exactMatches.map(unit => this.extractProductFamily(unit)));

      // Find neighboring tonnages (±1 only)
      const currentTonnage = parseFloat(searchInput.tonnage);
      const availableTonnages = NOMINAL_TONNAGES
        .map(t => parseFloat(t.tonnage))
        .sort((a, b) => a - b);

      const currentIndex = availableTonnages.indexOf(currentTonnage);
      const smallerTonnage = currentIndex > 0 ? availableTonnages[currentIndex - 1].toString() as Tonnage : null;
      const largerTonnage = currentIndex < availableTonnages.length - 1 ? availableTonnages[currentIndex + 1].toString() as Tonnage : null;

      // Search for smaller alternatives within same families only
      const smallerAlternatives: DaikinUnitSpec[] = [];
      if (smallerTonnage) {
        const smallerCriteria = { ...searchInput, tonnage: smallerTonnage };
        const potentialSmallerUnits = DAIKIN_R32_CATALOG.filter(unit => 
          this.strictExactMatch(unit, smallerCriteria) &&
          directMatchFamilies.has(this.extractProductFamily(unit))
        );
        smallerAlternatives.push(...potentialSmallerUnits);
      }

      // Search for larger alternatives within same families only
      const largerAlternatives: DaikinUnitSpec[] = [];
      if (largerTonnage) {
        const largerCriteria = { ...searchInput, tonnage: largerTonnage };
        const potentialLargerUnits = DAIKIN_R32_CATALOG.filter(unit => 
          this.strictExactMatch(unit, largerCriteria) &&
          directMatchFamilies.has(this.extractProductFamily(unit))
        );
        largerAlternatives.push(...potentialLargerUnits);
      }

      return {
        direct: exactMatches,
        neighbors: {
          smaller: smallerAlternatives,
          larger: largerAlternatives
        }
      };
      
    } catch (error) {
      console.error("Error in strict matching search:", error);
      return { direct: [], neighbors: { smaller: [], larger: [] } };
    }
  }

  /**
   * Helper method to map voltage strings to enum values
   */
  private mapVoltageToEnum(voltage: string): VoltageEnum {
    const normalizedVoltage = voltage.replace(/[^0-9-]/g, ''); // Remove non-digits and dashes
    
    if (normalizedVoltage.includes('208') || normalizedVoltage.includes('230')) {
      return "208-230";
    }
    if (normalizedVoltage.includes('460')) {
      return "460";
    }
    if (normalizedVoltage.includes('575')) {
      return "575";
    }
    
    // Default fallback
    return "208-230";
  }

  // ============================================================================
  // LEGACY COMPATIBILITY METHODS (UPDATED)
  // ============================================================================

  /**
   * Enhanced replacement search with comprehensive specs (UPDATED)
   */
  public findEnhancedReplacements(originalUnit: ParsedModel): EnhancedReplacementResult[] {
    try {
      // Use advanced matching for enhanced results
      const matchingRequest: AdvancedMatchingRequest = {
        original_capacity: originalUnit.btuCapacity,
        include_size_ladders: true,
        max_results: 10
      };

      const response = this.advancedMatching(matchingRequest);
      return response.matches;
      
    } catch (error) {
      console.error("Error finding enhanced replacements:", error);
      return [];
    }
  }

  // ============================================================================
  // MISSING METHODS FOR ROUTES.TS COMPATIBILITY
  // ============================================================================

  /**
   * Validate family specifications
   */
  public validateFamily(request: FamilyValidationRequest): FamilyValidationResponse {
    try {
      const validation = validateFamilySpecifications(
        request.family,
        request.positions.p4_p6,
        request.positions.p12,
        request.positions.p9_p11
      );

      return {
        is_valid: validation.isValid,
        validation_details: {
          capacity_valid: true,
          controls_valid: true,
          voltage_phase_check: true
        },
        errors: validation.errors,
        suggested_corrections: []
      };
    } catch (error) {
      return {
        is_valid: false,
        validation_details: {
          capacity_valid: false,
          controls_valid: false,
          voltage_phase_check: false
        },
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        suggested_corrections: []
      };
    }
  }

  /**
   * Search by specification input (UPDATED FOR STRICT EXACT MATCHING)
   */
  public searchBySpecInput(searchInput: SpecSearchInput): DaikinUnitSpec[] {
    try {
      return DAIKIN_R32_CATALOG.filter(unit => {
        // Use strict exact matching
        return this.strictExactMatch(unit, searchInput);
      });
    } catch (error) {
      console.error("Error in searchBySpecInput:", error);
      return [];
    }
  }

  /**
   * Get position mappings
   */
  public getPositionMappings(): PositionMapping {
    return POSITION_MAPPINGS;
  }

  /**
   * Get family definitions
   */
  public getFamilyDefinitions(): FamilyDefinitions {
    return FAMILY_DEFINITIONS;
  }

  /**
   * Get available families with optional tonnage filtering
   */
  public getAvailableFamilies(minTons?: number, maxTons?: number): DaikinFamilyKeys[] {
    const families = Object.keys(FAMILY_DEFINITIONS) as DaikinFamilyKeys[];
    
    if (!minTons && !maxTons) {
      return families;
    }
    
    return families.filter(familyKey => {
      const family = FAMILY_DEFINITIONS[familyKey];
      const capacities = Object.values(POSITION_MAPPINGS.p4_p6);
      const familyMin = Math.min(...capacities);
      const familyMax = Math.max(...capacities);
      
      if (minTons && familyMax < minTons) return false;
      if (maxTons && familyMin > maxTons) return false;
      
      return true;
    });
  }

  // ============================================================================
  // PUBLIC API METHODS (EXISTING)

  /**
   * Find Daikin replacements for a parsed original unit (UPDATED FOR STRICT MATCHING)
   */
  public findReplacements(originalUnit: ParsedModel, efficiencyPreference?: {
    preferredLevel?: "standard" | "high";
    energySavings?: boolean;
  }): Replacement[] {
    try {
      // Use strict exact matching for direct replacements
      const strictResults = this.findStrictReplacements(originalUnit, efficiencyPreference);
      
      const allReplacements: Replacement[] = [];
      
      // Add direct match if found (guaranteed to be exact)
      if (strictResults.direct) {
        allReplacements.push(strictResults.direct);
      }
      
      // Add exact alternatives
      allReplacements.push(...strictResults.alternatives);
      
      // Only if no strict matches found, fall back to tolerance-based matching for alternatives only
      if (allReplacements.length === 0) {
        console.warn(`No exact matches found for model ${originalUnit.modelNumber}. Using tolerance-based alternatives.`);
        
        const matchingOptions: MatchingOptions = {
          targetCapacity: originalUnit.btuCapacity,
          tolerance: 0.10 // 10% tolerance for alternatives only
        };

        // Find matches for each system type with tolerance
        const systemTypes: SystemType[] = ["Heat Pump", "Gas/Electric", "Straight A/C"];

        for (const systemType of systemTypes) {
          const systemOptions = { ...matchingOptions, systemType };
          const sizingResult = this.findOptimalSizing(systemOptions);
          
          // Add alternatives with clear indication they are not exact matches
          if (sizingResult.smallerAlternative) {
            allReplacements.push(this.createLegacyReplacement(sizingResult.smallerAlternative, "smaller"));
          }
          
          if (sizingResult.largerAlternative) {
            allReplacements.push(this.createLegacyReplacement(sizingResult.largerAlternative, "larger"));
          }
        }
      }

      // Filter by efficiency preferences if provided
      let filteredReplacements = allReplacements;
      if (efficiencyPreference) {
        filteredReplacements = this.filterByEfficiency(allReplacements, efficiencyPreference);
      }

      // Sort by system type preference, capacity proximity, and efficiency
      return this.sortReplacementsByPreference(filteredReplacements, originalUnit.btuCapacity, efficiencyPreference);
      
    } catch (error) {
      console.error("Error finding replacements:", error);
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
   * Extract product family identifier from model number
   */
  private extractProductFamily(unit: DaikinUnitSpec): string {
    // Extract family code from model number (e.g., "DZ17SA" from "DZ17SA0361A")
    const match = unit.modelNumber.match(/^([A-Z]{2}\d{2}[A-Z]{2})/);
    const familyCode = match ? match[1] : unit.modelNumber.substring(0, 6);
    
    // Include voltage and phases to ensure complete family constraint
    return `${familyCode}-${unit.voltage}-${unit.phases}`;
  }

  /**
   * Check if two units are from the same product family
   */
  private isSameProductFamily(unit1: DaikinUnitSpec, unit2: DaikinUnitSpec): boolean {
    return this.extractProductFamily(unit1) === this.extractProductFamily(unit2);
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
      { label: "SEER2 Rating", value: unit.seerRating.toString() },
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
   * Filter replacements by efficiency preferences
   */
  private filterByEfficiency(replacements: Replacement[], efficiencyPreference: {
    preferredLevel?: "standard" | "high";
    energySavings?: boolean;
  }): Replacement[] {
    return replacements.filter(replacement => {
      // Extract SEER rating from specifications
      const seerSpec = replacement.specifications.find(spec => 
        spec.label.toLowerCase().includes('seer')
      );
      const seerRating = seerSpec ? parseFloat(seerSpec.value) : 0;

      // Filter by preferred efficiency level
      if (efficiencyPreference.preferredLevel) {
        const levelRanges = {
          "standard": { min: 13, max: 15 },
          "high": { min: 16, max: 18 }
        };
        
        const range = levelRanges[efficiencyPreference.preferredLevel];
        if (seerRating < range.min || seerRating > range.max) {
          return false;
        }
      }

      // If energy savings is prioritized, prefer higher efficiency
      if (efficiencyPreference.energySavings && seerRating < 16) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort replacements by preference (system type, capacity proximity, and efficiency)
   */
  private sortReplacementsByPreference(
    replacements: Replacement[], 
    originalCapacity: number,
    efficiencyPreference?: {
      preferredLevel?: "standard" | "high";
      energySavings?: boolean;
    }
  ): Replacement[] {
    return replacements.sort((a, b) => {
      // First sort by system type preference
      const systemOrder = { "Heat Pump": 1, "Gas/Electric": 2, "Straight A/C": 3 };
      const systemDiff = (systemOrder[a.systemType] || 4) - (systemOrder[b.systemType] || 4);
      if (systemDiff !== 0) return systemDiff;
      
      // Then by efficiency if preference is set
      if (efficiencyPreference?.energySavings || efficiencyPreference?.preferredLevel) {
        const getSEER = (replacement: Replacement) => {
          const seerSpec = replacement.specifications.find(spec => 
            spec.label.toLowerCase().includes('seer')
          );
          return seerSpec ? parseFloat(seerSpec.value) : 0;
        };
        
        const aSEER = getSEER(a);
        const bSEER = getSEER(b);
        
        // Higher SEER is better (reverse order)
        if (aSEER !== bSEER) return bSEER - aSEER;
      }
      
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