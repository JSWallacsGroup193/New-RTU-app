import type { ParsedModel, Replacement } from "@shared/schema";

interface DaikinUnit {
  id: string;
  modelNumber: string;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  btuCapacity: number;
  voltage: string;
  phases: string;
  specifications: Array<{
    label: string;
    value: string;
    unit?: string;
  }>;
}

// Comprehensive Daikin product database
const DAIKIN_UNITS: DaikinUnit[] = [
  // Heat Pump Units
  {
    id: "dz14sa0181a",
    modelNumber: "DZ14SA0181A",
    systemType: "Heat Pump",
    btuCapacity: 18000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "HSPF Rating", value: "9.6" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "69", unit: "dB" },
      { label: "Dimensions", value: "35 x 35 x 28", unit: "in" },
      { label: "Weight", value: "285", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  {
    id: "dz14sa0241a", 
    modelNumber: "DZ14SA0241A",
    systemType: "Heat Pump",
    btuCapacity: 24000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "HSPF Rating", value: "9.6" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "70", unit: "dB" },
      { label: "Dimensions", value: "35 x 35 x 28", unit: "in" },
      { label: "Weight", value: "295", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  {
    id: "dz14sa0301a",
    modelNumber: "DZ14SA0301A", 
    systemType: "Heat Pump",
    btuCapacity: 30000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "HSPF Rating", value: "9.6" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "71", unit: "dB" },
      { label: "Dimensions", value: "44 x 44 x 32", unit: "in" },
      { label: "Weight", value: "365", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  {
    id: "dz14sa0361a",
    modelNumber: "DZ14SA0361A",
    systemType: "Heat Pump", 
    btuCapacity: 36000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "HSPF Rating", value: "9.6" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "70", unit: "dB" },
      { label: "Dimensions", value: "44 x 44 x 32", unit: "in" },
      { label: "Weight", value: "425", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  {
    id: "dz14sa0421a",
    modelNumber: "DZ14SA0421A",
    systemType: "Heat Pump",
    btuCapacity: 42000,
    voltage: "208-230", 
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "HSPF Rating", value: "9.6" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "71", unit: "dB" },
      { label: "Dimensions", value: "44 x 44 x 32", unit: "in" },
      { label: "Weight", value: "445", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  {
    id: "dz14sa0481a",
    modelNumber: "DZ14SA0481A",
    systemType: "Heat Pump",
    btuCapacity: 48000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "HSPF Rating", value: "9.6" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "72", unit: "dB" },
      { label: "Dimensions", value: "48 x 48 x 36", unit: "in" },
      { label: "Weight", value: "485", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  {
    id: "dz14sa0601a",
    modelNumber: "DZ14SA0601A",
    systemType: "Heat Pump",
    btuCapacity: 60000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "HSPF Rating", value: "9.6" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "74", unit: "dB" },
      { label: "Dimensions", value: "48 x 48 x 36", unit: "in" },
      { label: "Weight", value: "545", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  // Gas/Electric Units
  {
    id: "dz14gs0361a",
    modelNumber: "DZ14GS0361A",
    systemType: "Gas/Electric",
    btuCapacity: 36000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "AFUE Rating", value: "80%" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "69", unit: "dB" },
      { label: "Dimensions", value: "44 x 44 x 34", unit: "in" },
      { label: "Weight", value: "465", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  {
    id: "dz14gs0481a",
    modelNumber: "DZ14GS0481A",
    systemType: "Gas/Electric",
    btuCapacity: 48000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "AFUE Rating", value: "80%" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "70", unit: "dB" },
      { label: "Dimensions", value: "48 x 48 x 38", unit: "in" },
      { label: "Weight", value: "520", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  {
    id: "dz14gs0601a",
    modelNumber: "DZ14GS0601A",
    systemType: "Gas/Electric",
    btuCapacity: 60000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "AFUE Rating", value: "80%" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "72", unit: "dB" },
      { label: "Dimensions", value: "48 x 48 x 38", unit: "in" },
      { label: "Weight", value: "565", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  // Straight A/C Units
  {
    id: "dz14ac0241a",
    modelNumber: "DZ14AC0241A",
    systemType: "Straight A/C",
    btuCapacity: 24000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "EER Rating", value: "12.5" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "68", unit: "dB" },
      { label: "Dimensions", value: "35 x 35 x 28", unit: "in" },
      { label: "Weight", value: "265", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  {
    id: "dz14ac0361a",
    modelNumber: "DZ14AC0361A",
    systemType: "Straight A/C",
    btuCapacity: 36000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "EER Rating", value: "12.5" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "70", unit: "dB" },
      { label: "Dimensions", value: "44 x 44 x 32", unit: "in" },
      { label: "Weight", value: "395", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  {
    id: "dz14ac0481a",
    modelNumber: "DZ14AC0481A",
    systemType: "Straight A/C",
    btuCapacity: 48000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "EER Rating", value: "12.5" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "71", unit: "dB" },
      { label: "Dimensions", value: "48 x 48 x 36", unit: "in" },
      { label: "Weight", value: "455", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  },
  {
    id: "dz14ac0601a",
    modelNumber: "DZ14AC0601A",
    systemType: "Straight A/C",
    btuCapacity: 60000,
    voltage: "208-230",
    phases: "1",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "EER Rating", value: "12.5" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "73", unit: "dB" },
      { label: "Dimensions", value: "48 x 48 x 36", unit: "in" },
      { label: "Weight", value: "515", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  }
];

export class DaikinMatcher {
  public findReplacements(originalUnit: ParsedModel): Replacement[] {
    const replacements: Replacement[] = [];
    const targetCapacity = originalUnit.btuCapacity;
    
    // Find matches for each system type
    const systemTypes: Array<"Heat Pump" | "Gas/Electric" | "Straight A/C"> = 
      ["Heat Pump", "Gas/Electric", "Straight A/C"];
    
    for (const systemType of systemTypes) {
      const unitsOfType = DAIKIN_UNITS.filter(unit => unit.systemType === systemType);
      
      // Find direct match (within 10% capacity range)
      const directMatch = this.findClosestMatch(unitsOfType, targetCapacity, 0.1);
      if (directMatch) {
        replacements.push(this.createReplacement(directMatch, "direct"));
      }
      
      // Find smaller size (20-30% smaller)
      const smallerMatch = this.findSmallerMatch(unitsOfType, targetCapacity);
      if (smallerMatch) {
        replacements.push(this.createReplacement(smallerMatch, "smaller"));
      }
      
      // Find larger size (20-30% larger)
      const largerMatch = this.findLargerMatch(unitsOfType, targetCapacity);
      if (largerMatch) {
        replacements.push(this.createReplacement(largerMatch, "larger"));
      }
    }
    
    return replacements;
  }

  private findClosestMatch(units: DaikinUnit[], targetCapacity: number, tolerance: number): DaikinUnit | null {
    const threshold = targetCapacity * tolerance;
    
    return units
      .filter(unit => Math.abs(unit.btuCapacity - targetCapacity) <= threshold)
      .sort((a, b) => Math.abs(a.btuCapacity - targetCapacity) - Math.abs(b.btuCapacity - targetCapacity))[0] || null;
  }

  private findSmallerMatch(units: DaikinUnit[], targetCapacity: number): DaikinUnit | null {
    const minCapacity = targetCapacity * 0.7; // 30% smaller
    const maxCapacity = targetCapacity * 0.8; // 20% smaller
    
    return units
      .filter(unit => unit.btuCapacity >= minCapacity && unit.btuCapacity <= maxCapacity)
      .sort((a, b) => Math.abs(a.btuCapacity - (targetCapacity * 0.75)) - Math.abs(b.btuCapacity - (targetCapacity * 0.75)))[0] || null;
  }

  private findLargerMatch(units: DaikinUnit[], targetCapacity: number): DaikinUnit | null {
    const minCapacity = targetCapacity * 1.2; // 20% larger
    const maxCapacity = targetCapacity * 1.3; // 30% larger
    
    return units
      .filter(unit => unit.btuCapacity >= minCapacity && unit.btuCapacity <= maxCapacity)
      .sort((a, b) => Math.abs(a.btuCapacity - (targetCapacity * 1.25)) - Math.abs(b.btuCapacity - (targetCapacity * 1.25)))[0] || null;
  }

  private createReplacement(daikinUnit: DaikinUnit, sizeMatch: "smaller" | "direct" | "larger"): Replacement {
    return {
      id: daikinUnit.id,
      modelNumber: daikinUnit.modelNumber,
      systemType: daikinUnit.systemType,
      btuCapacity: daikinUnit.btuCapacity,
      voltage: daikinUnit.voltage,
      phases: daikinUnit.phases,
      specifications: daikinUnit.specifications,
      sizeMatch
    };
  }

  public searchBySpecs(
    btuMin: number,
    btuMax: number,
    systemType?: "Heat Pump" | "Gas/Electric" | "Straight A/C",
    voltage?: string
  ): DaikinUnit[] {
    return DAIKIN_UNITS.filter(unit => {
      const capacityMatch = unit.btuCapacity >= btuMin && unit.btuCapacity <= btuMax;
      const systemMatch = !systemType || unit.systemType === systemType;
      const voltageMatch = !voltage || unit.voltage === voltage;
      
      return capacityMatch && systemMatch && voltageMatch;
    });
  }
}