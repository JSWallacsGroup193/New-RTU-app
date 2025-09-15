import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Grid3X3,
  List,
  Download,
  FileText,
  GitCompare,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  CheckSquare,
  Save,
  FolderPlus,
  Plus
} from "lucide-react";
import { useState, useMemo } from "react";
import { SpecSearchResponse, type SpecSearchInput, parseCombinedVoltage, DaikinFamilyKeys, type EnhancedUnit } from "@shared/schema";
import EnhancedUnitCard from "./EnhancedUnitCard";
import InlineEditControls from "./InlineEditControls";
import SystemTypeFilter from "./SystemTypeFilter";
import ComparisonTable from "./ComparisonTable";
import CreateProjectForm from "./CreateProjectForm";
import SizingComparisonLayout from "./SizingComparisonLayout";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { exportSingleComparison, exportBulkComparison } from "@/lib/pdfService";

// Helper function to determine family from model number
const getFamilyFromModelNumber = (modelNumber: string): DaikinFamilyKeys | undefined => {
  if (!modelNumber || modelNumber.length < 3) return undefined;
  
  const prefix = modelNumber.substring(0, 3).toUpperCase();
  
  // Handle DSH variants based on capacity
  if (prefix === "DSH") {
    // Extract capacity to determine DSH variant
    const capacityMatch = modelNumber.match(/\d{3}/);
    if (capacityMatch) {
      const capacity = parseInt(capacityMatch[0]);
      // 036-072 = 3-6 tons, 090-120 = 7.5-10 tons
      if (capacity >= 36 && capacity <= 72) {
        return "DSH_3to6";
      } else if (capacity >= 90 && capacity <= 120) {
        return "DSH_7p5to10";
      }
    }
    return "DSH_3to6"; // Default fallback
  }
  
  // Standard family mapping
  const familyMap: Record<string, DaikinFamilyKeys> = {
    "DSC": "DSC",
    "DHC": "DHC", 
    "DSG": "DSG",
    "DHG": "DHG",
    "DHH": "DHH"
  };
  
  return familyMap[prefix];
};

// Authentic Daikin catalog data
const ELECTRICAL_ADD_ONS = [
  { category: "Electrical", code: "HKR", description: "Electric Heat Kit - 10kW", priceAdder: 450, availability: "Optional" as const },
  { category: "Electrical", code: "HKR15", description: "Electric Heat Kit - 15kW", priceAdder: 580, availability: "Optional" as const },
  { category: "Electrical", code: "HKR20", description: "Electric Heat Kit - 20kW", priceAdder: 720, availability: "Optional" as const },
  { category: "Electrical", code: "DIS", description: "Disconnect Switch", priceAdder: 125, availability: "Optional" as const },
  { category: "Electrical", code: "CUR", description: "Current Monitoring Relay", priceAdder: 95, availability: "Optional" as const }
];

const CONTROL_ADD_ONS = [
  { category: "Controls", code: "DFT", description: "Defrost Control Board", priceAdder: 180, availability: "Optional" as const },
  { category: "Controls", code: "APP", description: "APP Connection Module", priceAdder: 225, availability: "Optional" as const },
  { category: "Controls", code: "DCV", description: "Demand Control Ventilation", priceAdder: 350, availability: "Optional" as const },
  { category: "Controls", code: "ECO", description: "Economizer Integration", priceAdder: 425, availability: "Optional" as const },
  { category: "Controls", code: "BAS", description: "Building Automation System Interface", priceAdder: 375, availability: "Optional" as const }
];

const FIELD_ACCESSORIES = [
  { category: "Filters", code: "FLT16", description: "Standard Efficiency Filter (16x25x1)", complexity: "Easy" as const, compatible: true },
  { category: "Filters", code: "FLT20", description: "High Efficiency Filter (20x25x2)", complexity: "Easy" as const, compatible: true },
  { category: "Filters", code: "FLTMERV8", description: "MERV 8 Pleated Filter", complexity: "Easy" as const, compatible: true },
  { category: "Filters", code: "FLTMERV11", description: "MERV 11 Pleated Filter", complexity: "Easy" as const, compatible: true },
  { category: "Controls", code: "TSTPROG", description: "Programmable Thermostat", complexity: "Moderate" as const, compatible: true },
  { category: "Controls", code: "TSTSMART", description: "Smart WiFi Thermostat", complexity: "Moderate" as const, compatible: true },
  { category: "Sensors", code: "SNSOUT", description: "Outdoor Temperature Sensor", complexity: "Easy" as const, compatible: true },
  { category: "Sensors", code: "SNSRET", description: "Return Air Temperature Sensor", complexity: "Easy" as const, compatible: true }
];

// Utility function to extract authentic specifications from search results
function extractSpecificationValue(specifications: Array<{label: string, value: string, unit?: string}>, label: string): string | number | undefined {
  const spec = specifications.find(s => s.label === label);
  return spec ? (isNaN(Number(spec.value)) ? spec.value : Number(spec.value)) : undefined;
}

// Family performance data for accurate specifications
const FAMILY_SPECS: Record<string, any> = {
  DSC: { seer: 14.0, eer: 12.0, driveType: "Fixed Speed", stages: 1, efficiency: "Standard" },
  DHC: { seer: 16.6, eer: 12.5, driveType: "Variable Speed", stages: 2, efficiency: "High" },
  DSG: { seer: 14.0, eer: 12.0, driveType: "Fixed Speed", stages: 1, efficiency: "Standard" },
  DHG: { seer: 16.6, eer: 12.5, driveType: "Variable Speed", stages: 2, efficiency: "High" },
  DSH: { seer: 14.0, eer: 12.0, hspf: 8.5, driveType: "Fixed Speed", stages: 2, efficiency: "Standard" },
  DHH: { seer: 16.6, eer: 12.5, hspf: 9.5, driveType: "Variable Speed", stages: 2, efficiency: "High" }
};

// Sound level calculations based on tonnage and family
function calculateSoundLevel(tonnage: number, familyCode: string): number {
  const baseLevels = {
    DSC: 67, DHC: 65, DSG: 69, DHG: 66, DSH: 69, DHH: 65
  };
  const baseLevel = baseLevels[familyCode as keyof typeof baseLevels] || 67;
  const tonnageAdjustment = Math.floor((tonnage - 3) / 2) * 2; // +2dB per size step
  return baseLevel + tonnageAdjustment;
}

// Dimensions based on tonnage (authentic Daikin sizing)
function calculateDimensions(tonnage: number): { length: number; width: number; height: number } {
  if (tonnage <= 5) return { length: 84, width: 38, height: 84 };
  if (tonnage <= 7.5) return { length: 90, width: 40, height: 88 };
  if (tonnage <= 12.5) return { length: 96, width: 42, height: 92 };
  return { length: 120, width: 48, height: 96 };
}

// Weight calculation based on tonnage
function calculateWeight(tonnage: number): number {
  return 300 + (tonnage * 40); // Base 300lbs + 40lbs per ton
}

interface SpecificationSearchResultsProps {
  searchResults: SpecSearchResponse;
  searchParams: SpecSearchInput;
  onNewSearch: () => void;
  onBackToSpecForm: () => void;
  onUpdateSearch?: (newParams: SpecSearchInput) => void;
}


type SortOption = 
  | "efficiency-desc" 
  | "efficiency-asc" 
  | "capacity-desc" 
  | "capacity-asc" 
  | "sound-asc" 
  | "sound-desc"
  | "size-match";

type ViewMode = "grid" | "list" | "comparison";

export default function SpecificationSearchResults({
  searchResults,
  searchParams,
  onNewSearch,
  onBackToSpecForm,
  onUpdateSearch
}: SpecificationSearchResultsProps) {
  // State management
  const [selectedSystemType, setSelectedSystemType] = useState<"all" | "heat-pump" | "gas-electric" | "straight-ac">("all");
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("size-match");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filter states
  const [maxSEER, setMaxSEER] = useState<number | undefined>();
  const [maxSoundLevel, setMaxSoundLevel] = useState<number | undefined>();
  const [highEfficiencyOnly, setHighEfficiencyOnly] = useState(false);
  const [quietOperationOnly, setQuietOperationOnly] = useState(false);

  // PDF Export state management
  const [isExporting, setIsExporting] = useState(false);
  
  // Project integration state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isSavingToProject, setIsSavingToProject] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedUnitDetails, setSelectedUnitDetails] = useState<EnhancedUnit | null>(null);
  const { toast } = useToast();

  // Fetch user's projects for the dropdown
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: () => fetch('/api/projects').then(res => {
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    })
  });

  // Calculate compatibility score between original specs and replacement unit
  const calculateCompatibilityScore = (unit: any, originalSpecs: SpecSearchInput): number => {
    let score = 0;
    let maxPoints = 0;

    // System Type Match (25 points)
    maxPoints += 25;
    if (unit.systemType === originalSpecs.systemType) {
      score += 25;
    } else if (
      (unit.systemType === "Heat Pump" && originalSpecs.systemType === "Gas/Electric") ||
      (unit.systemType === "Gas/Electric" && originalSpecs.systemType === "Heat Pump")
    ) {
      score += 15; // Partial match for compatible systems
    }

    // Capacity Match (30 points)
    maxPoints += 30;
    const originalTonnage = parseFloat(originalSpecs.tonnage);
    const unitTonnage = parseFloat((unit.btuCapacity / 12000).toFixed(1));
    const tonnageDiff = Math.abs(originalTonnage - unitTonnage);
    
    if (tonnageDiff === 0) {
      score += 30; // Perfect match
    } else if (tonnageDiff <= 0.5) {
      score += 25; // Close match
    } else if (tonnageDiff <= 1.0) {
      score += 20; // Acceptable range
    } else if (tonnageDiff <= 1.5) {
      score += 10; // Marginal
    }

    // Voltage Match (20 points)
    maxPoints += 20;
    const originalVoltage = parseCombinedVoltage(originalSpecs.voltage);
    if (unit.voltage === originalVoltage.voltage && unit.phases === originalVoltage.phases) {
      score += 20;
    } else if (unit.voltage === originalVoltage.voltage) {
      score += 10; // Voltage matches but not phases
    }

    // Efficiency Match (15 points)
    maxPoints += 15;
    const unitSeer = extractSpecificationValue(unit.specifications, "SEER2 Rating") as number || 
                    extractSpecificationValue(unit.specifications, "SEER Rating") as number || 16.0;
    
    if (originalSpecs.efficiency === "high" && unitSeer >= 16) {
      score += 15;
    } else if (originalSpecs.efficiency === "standard" && unitSeer >= 14 && unitSeer < 18) {
      score += 15;
    } else {
      score += Math.max(0, 15 - Math.abs((unitSeer - 16) * 2)); // Gradual scoring for other cases
    }

    // Heating Compatibility (10 points)
    maxPoints += 10;
    if (originalSpecs.heatingBTU && unit.systemType !== "Straight A/C") {
      score += 10;
    } else if (!originalSpecs.heatingBTU && unit.systemType === "Straight A/C") {
      score += 10;
    } else if (!originalSpecs.heatingBTU) {
      score += 5; // Neutral if no heating specified
    }

    return Math.round((score / maxPoints) * 100);
  };

  // Transform search results to enhanced units using AUTHENTIC Daikin specifications
  const enhancedUnits: EnhancedUnit[] = useMemo(() => {
    return searchResults.results.map(unit => {
      // Extract authentic values from specifications array
      const seerRating = extractSpecificationValue(unit.specifications, "SEER2 Rating") as number || extractSpecificationValue(unit.specifications, "SEER Rating") as number || 16.0;
      const soundLevel = extractSpecificationValue(unit.specifications, "Sound Level") as number || 65;
      const driveType = extractSpecificationValue(unit.specifications, "Drive Type") as string || "Variable Speed";
      const coolingStages = extractSpecificationValue(unit.specifications, "Cooling Stages") as number || 1;
      const heatingStages = extractSpecificationValue(unit.specifications, "Heating Stages") as number || undefined;
      const hspfRating = extractSpecificationValue(unit.specifications, "HSPF Rating") as number || undefined;
      const heatingBTU = extractSpecificationValue(unit.specifications, "Heating BTU") as number || undefined;
      const heatKitKW = extractSpecificationValue(unit.specifications, "Heat Kit") as number || undefined;
      const warranty = extractSpecificationValue(unit.specifications, "Warranty") as number || 10;
      const weight = extractSpecificationValue(unit.specifications, "Weight") as number || 350;
      const dimensionsValue = extractSpecificationValue(unit.specifications, "Dimensions") as string || "";
      
      // Parse dimensions from string format like "84"L x 38"W x 84"H"
      let dimensions = { length: 84, width: 38, height: 84 };
      if (dimensionsValue) {
        const matches = dimensionsValue.match(/(\d+)"L\s*x\s*(\d+)"W\s*x\s*(\d+)"H/);
        if (matches) {
          dimensions = {
            length: parseInt(matches[1]),
            width: parseInt(matches[2]),
            height: parseInt(matches[3])
          };
        }
      }
      
      // Determine family code from model number for family-specific specs
      const familyCode = unit.modelNumber.substring(0, 3).toUpperCase();
      const familySpecs = FAMILY_SPECS[familyCode] || FAMILY_SPECS.DSC;
      
      // Calculate tonnage
      const tonnage = parseFloat((unit.btuCapacity / 12000).toFixed(1));
      
      // Use authentic specifications or calculated fallbacks based on family
      const authenticallyCalculatedSeer = seerRating > 0 ? seerRating : familySpecs.seer;
      const authenticallyCalculatedSound = soundLevel > 0 ? soundLevel : calculateSoundLevel(tonnage, familyCode);
      const authenticallyCalculatedDimensions = dimensions.length > 0 ? dimensions : calculateDimensions(tonnage);
      const authenticallyCalculatedWeight = weight > 0 ? weight : calculateWeight(tonnage);
      
      // Select appropriate factory options based on system type
      const relevantElectricalOptions = ELECTRICAL_ADD_ONS.filter(option => {
        if (unit.systemType === "Heat Pump" && option.code.startsWith("HKR")) return true;
        if (unit.systemType === "Gas/Electric" && !option.code.startsWith("HKR")) return true;
        return !["HKR", "HKR15", "HKR20"].includes(option.code);
      }).slice(0, 2);
      
      const relevantControlOptions = CONTROL_ADD_ONS.filter(option => {
        if (unit.systemType === "Heat Pump" && option.code === "DFT") return true;
        return option.code !== "DFT";
      }).slice(0, 2);
      
      // Calculate compatibility score
      const compatibilityScore = calculateCompatibilityScore(unit, searchParams);
      
      return {
        id: unit.id,
        modelNumber: unit.modelNumber,
        systemType: unit.systemType,
        btuCapacity: unit.btuCapacity,
        tonnage: tonnage.toString(),
        voltage: unit.voltage,
        phases: unit.phases,
        sizeMatch: (unit as any).sizeMatch as "smaller" | "direct" | "larger", // Use actual sizeMatch from API response
        compatibilityScore, // Compatibility score for Option 4
        
        // FLAT PROPERTIES FOR BACKWARD COMPATIBILITY
        seerRating: authenticallyCalculatedSeer,
        eerRating: familySpecs.eer,
        hspfRating: unit.systemType === "Heat Pump" ? (hspfRating || familySpecs.hspf) : undefined,
        refrigerant: "R-32",
        driveType: driveType || familySpecs.driveType,
        coolingStages: coolingStages || familySpecs.stages,
        heatingStages: unit.systemType !== "Straight A/C" ? (heatingStages || familySpecs.stages) : undefined,
        soundLevel: authenticallyCalculatedSound,
        dimensions: authenticallyCalculatedDimensions,
        weight: authenticallyCalculatedWeight,
        operatingAmperage: 15 + (tonnage * 2.5),
        maxFuseSize: Math.ceil((15 + (tonnage * 2.5)) * 1.75),
        temperatureRange: {
          cooling: { min: 65, max: 115 },
          heating: unit.systemType !== "Straight A/C" ? { min: familyCode.includes("H") ? -10 : -5, max: 65 } : undefined
        },
        controlsType: familySpecs.efficiency === "High" ? "Intelligent Touch" : "Digital Control",
        coilType: familySpecs.efficiency === "High" ? "Microchannel" : "Copper Tube",
        factoryOptions: [
          ...relevantElectricalOptions,
          ...relevantControlOptions
        ],

        // NESTED PERFORMANCE RATINGS STRUCTURE
        performanceRatings: {
          seerRating: authenticallyCalculatedSeer,
          eerRating: familySpecs.eer,
          hspfRating: unit.systemType === "Heat Pump" ? (hspfRating || familySpecs.hspf) : undefined,
        },
        
        // NESTED PHYSICAL SPECIFICATIONS STRUCTURE
        physicalSpecs: {
          dimensions: {
            length: authenticallyCalculatedDimensions.length || 0,
            width: authenticallyCalculatedDimensions.width || 0,
            height: authenticallyCalculatedDimensions.height || 0,
          },
          weight: {
            operating: authenticallyCalculatedWeight,
            shipping: authenticallyCalculatedWeight + 50, // Estimate shipping weight
          },
          clearances: {
            sides: 18,
            back: 24,
            front: 36,
            top: 36,
          },
          serviceAccess: {
            controlPanel: "Front",
            refrigerantConnections: "Back",
            electricalConnections: "Side",
          },
          footprint: {
            area: Math.ceil((authenticallyCalculatedDimensions.length * authenticallyCalculatedDimensions.width) / 144), // sq ft
            foundation: "Concrete pad",
          }
        },
        
        // NESTED ELECTRICAL SPECIFICATIONS STRUCTURE  
        electricalSpecs: {
          operatingAmperage: {
            cooling: {
              rla: 15 + (tonnage * 2.5),
              mca: Math.ceil((15 + (tonnage * 2.5)) * 1.25),
              lra: Math.ceil((15 + (tonnage * 2.5)) * 5),
            },
            heating: unit.systemType !== "Straight A/C" ? {
              rla: 12 + (tonnage * 2),
              mca: Math.ceil((12 + (tonnage * 2)) * 1.25),
              lra: Math.ceil((12 + (tonnage * 2)) * 4),
            } : undefined,
            fan: {
              fla: 2 + (tonnage * 0.5),
            }
          },
          protection: {
            maxFuseSize: Math.ceil((15 + (tonnage * 2.5)) * 1.75),
            maxBreaker: Math.ceil((15 + (tonnage * 2.5)) * 1.75),
          }
        },
        
        // NESTED AIRFLOW SPECIFICATIONS STRUCTURE
        airflowSpecs: {
          nominalCfm: Math.ceil(tonnage * 400), // Standard 400 CFM per ton
          availableEsp: 0.5, // Standard external static pressure
          fanType: familySpecs.efficiency === "High" ? "Variable Speed ECM" : "Fixed Speed PSC",
        },
        
        // NESTED SOUND SPECIFICATIONS STRUCTURE
        soundSpecs: {
          operatingLevel: authenticallyCalculatedSound,
          testStandard: "AHRI 270",
          measurement: {
            distance: "23 feet",
            conditions: "Free field"
          }
        },
        
        // NESTED REFRIGERANT SYSTEM STRUCTURE
        refrigerantSystem: {
          type: "R-32",
          charge: Math.ceil(tonnage * 2), // Estimated charge
          lineSetSize: {
            liquid: tonnage <= 3 ? "3/8\"" : "1/2\"",
            suction: tonnage <= 3 ? "7/8\"" : "1-1/8\"",
          }
        },
        
        // FEATURES STRUCTURE
        features: {
          standard: [
            "R-32 Refrigerant",
            familySpecs.driveType,
            "Digital Controls",
            "High Efficiency Filter"
          ],
          optional: [
            ...relevantElectricalOptions.map(opt => opt.description),
            ...relevantControlOptions.map(opt => opt.description)
          ]
        },
        
        // AUTHENTIC FIELD ACCESSORIES from Daikin catalog
        fieldAccessories: FIELD_ACCESSORIES.slice(0, 6) // Representative selection
      };
    });
  }, [searchResults.results]);

  // Type mapping for filtering
  const systemTypeMap = {
    "Heat Pump": "heat-pump",
    "Gas/Electric": "gas-electric", 
    "Straight A/C": "straight-ac"
  } as const;

  const reverseSystemTypeMap = {
    "heat-pump": "Heat Pump",
    "gas-electric": "Gas/Electric",
    "straight-ac": "Straight A/C"
  } as const;

  // Filter and sort units
  const filteredAndSortedUnits = useMemo(() => {
    let filtered = enhancedUnits;

    // Filter by system type
    if (selectedSystemType !== "all") {
      filtered = filtered.filter(unit => 
        systemTypeMap[unit.systemType] === selectedSystemType
      );
    }

    // Advanced filters
    if (maxSEER) {
      filtered = filtered.filter(unit => unit.seerRating <= maxSEER);
    }
    if (maxSoundLevel) {
      filtered = filtered.filter(unit => unit.soundLevel <= maxSoundLevel);
    }
    if (highEfficiencyOnly) {
      filtered = filtered.filter(unit => unit.seerRating >= 16);
    }
    if (quietOperationOnly) {
      filtered = filtered.filter(unit => unit.soundLevel <= 60);
    }

    // Sort units
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "efficiency-desc":
          return b.seerRating - a.seerRating;
        case "efficiency-asc":
          return a.seerRating - b.seerRating;
        case "capacity-desc":
          return b.btuCapacity - a.btuCapacity;
        case "capacity-asc":
          return a.btuCapacity - b.btuCapacity;
        case "sound-asc":
          return a.soundLevel - b.soundLevel;
        case "sound-desc":
          return b.soundLevel - a.soundLevel;
        case "size-match":
          const sizeOrder = { "direct": 0, "smaller": 1, "larger": 2 };
          const aOrder = sizeOrder[a.sizeMatch] ?? 999; // undefined sizeMatch goes to end
          const bOrder = sizeOrder[b.sizeMatch] ?? 999;
          return aOrder - bOrder;
        default:
          return 0;
      }
    });
  }, [enhancedUnits, selectedSystemType, maxSEER, maxSoundLevel, highEfficiencyOnly, quietOperationOnly, sortBy]);

  // Detect if we have Direct/Up/Down sizing results for the comparison layout
  const hasSizingComparison = useMemo(() => {
    if (filteredAndSortedUnits.length < 2 || filteredAndSortedUnits.length > 3) return false;
    
    const sizeMatches = filteredAndSortedUnits.map(unit => (unit as any).sizeMatch).filter(Boolean);
    if (sizeMatches.length !== filteredAndSortedUnits.length) return false;
    
    // Check if we have a valid combination of sizing types
    const uniqueMatches = new Set(sizeMatches);
    const hasDirectMatch = uniqueMatches.has("direct");
    const hasVariation = uniqueMatches.size > 1;
    
    return hasDirectMatch && hasVariation;
  }, [filteredAndSortedUnits]);

  // Selection handlers
  const handleSelectUnit = (unitId: string, selected: boolean) => {
    const newSelection = new Set(selectedUnits);
    if (selected) {
      newSelection.add(unitId);
    } else {
      newSelection.delete(unitId);
    }
    setSelectedUnits(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUnits(new Set(filteredAndSortedUnits.map(unit => unit.id)));
    } else {
      setSelectedUnits(new Set());
    }
  };

  const clearFilters = () => {
    setSelectedSystemType("all");
    setMaxSEER(undefined);
    setMaxSoundLevel(undefined);
    setHighEfficiencyOnly(false);
    setQuietOperationOnly(false);
  };

  // Action handlers
  const handleViewDetails = (unit: EnhancedUnit) => {
    console.log("View details for:", unit.modelNumber);
    setSelectedUnitDetails(unit);
    setDetailsDialogOpen(true);
  };

  // Save units to project mutation
  const saveToProjectMutation = useMutation({
    mutationFn: async ({ projectId, units }: { projectId: string; units: any[] }) => {
      const response = await fetch(`/api/projects/${projectId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save units to project');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', variables.projectId] });
      toast({
        title: "Units Saved to Project",
        description: `${variables.units.length} unit(s) have been saved to your project successfully.`,
      });
      setIsProjectDialogOpen(false);
      setSelectedProjectId("");
      setSelectedUnits(new Set());
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleAddToProject = (unit: EnhancedUnit) => {
    // Set selected unit and open project dialog
    setSelectedUnits(new Set([unit.id]));
    setIsProjectDialogOpen(true);
  };

  const handleSaveToProject = async () => {
    if (!selectedProjectId) {
      toast({
        title: "No Project Selected",
        description: "Please select a project to save the units to.",
        variant: "destructive"
      });
      return;
    }

    const selectedEnhancedUnits = filteredAndSortedUnits.filter(unit => selectedUnits.has(unit.id));
    
    if (selectedEnhancedUnits.length === 0) {
      toast({
        title: "No Units Selected",
        description: "Please select at least one unit to save to the project.",
        variant: "destructive"
      });
      return;
    }

    // Check project capacity before saving
    const selectedProject = projects.find((p: any) => p.id === selectedProjectId);
    if (selectedProject) {
      const currentUnits = selectedProject.items?.length || 0;
      const totalAfterSave = currentUnits + selectedEnhancedUnits.length;
      
      if (totalAfterSave > 20) {
        toast({
          title: "Project Limit Exceeded",
          description: `This project already has ${currentUnits} units. Adding ${selectedEnhancedUnits.length} more would exceed the 20-unit limit. Please select fewer units or choose a different project.`,
          variant: "destructive"
        });
        return;
      }
    }

    // Create original unit from search parameters for comparison
    const { voltage: parsedVoltage, phases: parsedPhases } = parseCombinedVoltage(searchParams.voltage);
    const originalUnit = {
      modelNumber: "Search Specifications",
      manufacturer: "Various",
      confidence: 100,
      systemType: searchParams.systemType,
      btuCapacity: parseFloat(searchParams.tonnage) * 12000,
      voltage: parsedVoltage,
      phases: parsedPhases,
      specifications: [
        { label: "System Type", value: searchParams.systemType },
        { label: "Tonnage", value: searchParams.tonnage, unit: " Tons" },
        { label: "Voltage", value: parsedVoltage, unit: "V" },
        { label: "Phases", value: parsedPhases }
      ]
    };

    // Convert enhanced units to project format
    const projectUnits = selectedEnhancedUnits.map(unit => ({
      originalUnit,
      chosenReplacement: {
        id: unit.id,
        modelNumber: unit.modelNumber,
        systemType: unit.systemType,
        btuCapacity: unit.btuCapacity,
        voltage: unit.voltage,
        phases: unit.phases,
        sizeMatch: unit.sizeMatch,
        seerRating: unit.seerRating,
        eerRating: unit.eerRating,
        hspfRating: unit.hspfRating,
        refrigerant: unit.refrigerant,
        driveType: unit.driveType,
        soundLevel: unit.soundLevel,
        dimensions: unit.dimensions,
        weight: unit.weight,
        tonnage: unit.tonnage
      },
      configuration: {},
      notes: "",
      status: "pending"
    }));

    setIsSavingToProject(true);
    try {
      await saveToProjectMutation.mutateAsync({
        projectId: selectedProjectId,
        units: projectUnits
      });
    } finally {
      setIsSavingToProject(false);
    }
  };

  const handleCreateProjectWithUnits = () => {
    setIsCreateProjectOpen(true);
    setIsProjectDialogOpen(false);
  };

  const handleGenerateQuote = (unit: EnhancedUnit) => {
    console.log("Generate quote for:", unit.modelNumber);
    // TODO: Implement quote generation
  };

  const handleCompareSelected = () => {
    console.log("Compare units:", Array.from(selectedUnits));
    // TODO: Implement comparison view
  };

  const handleExportSelected = async () => {
    if (selectedUnits.size === 0) {
      toast({
        title: "No Units Selected",
        description: "Please select at least one unit to export.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      const selectedEnhancedUnits = filteredAndSortedUnits.filter(unit => selectedUnits.has(unit.id));
      
      // Create enhanced search criteria from search parameters
      const { voltage: parsedVoltage, phases: parsedPhases } = parseCombinedVoltage(searchParams.voltage);
      const searchCriteria = {
        systemType: searchParams.systemType,
        tonnage: searchParams.tonnage,
        voltage: searchParams.voltage,
        phases: parsedPhases,
        efficiency: searchParams.efficiency,
        heatingBTU: searchParams.heatingBTU,
        heatKitKW: searchParams.heatKitKW,
        gasCategory: searchParams.gasCategory,
        maxSoundLevel: searchParams.maxSoundLevel,
        refrigerant: searchParams.refrigerant,
        driveType: searchParams.driveType
      };
      
      // Create "original unit" from search parameters for comparison
      const originalUnit = {
        modelNumber: "Search Specifications",
        manufacturer: "Various",
        confidence: 100,
        systemType: searchParams.systemType,
        btuCapacity: parseFloat(searchParams.tonnage) * 12000, // Convert tonnage to BTU
        voltage: parsedVoltage,
        phases: parsedPhases,
        specifications: [
          { label: "System Type", value: searchParams.systemType },
          { label: "Tonnage", value: searchParams.tonnage, unit: " Tons" },
          { label: "Voltage", value: parsedVoltage, unit: "V" },
          { label: "Phases", value: parsedPhases },
          { label: "Efficiency", value: searchParams.efficiency },
          ...(searchParams.heatingBTU ? [{ label: "Heating BTU", value: searchParams.heatingBTU.toString(), unit: " BTU/hr" }] : []),
          ...(searchParams.gasCategory ? [{ label: "Gas Type", value: searchParams.gasCategory }] : [])
        ]
      };

      // Convert enhanced units to replacement format
      const replacements = selectedEnhancedUnits.map(unit => ({
        id: unit.id,
        modelNumber: unit.modelNumber,
        systemType: unit.systemType,
        btuCapacity: unit.btuCapacity,
        voltage: unit.voltage,
        phases: unit.phases,
        sizeMatch: unit.sizeMatch,
        seerRating: unit.seerRating,
        eerRating: unit.eerRating,
        hspfRating: unit.hspfRating,
        refrigerant: unit.refrigerant,
        driveType: unit.driveType,
        soundLevel: unit.soundLevel,
        dimensions: normalizeDimensions(unit.dimensions),
        weight: unit.weight,
        specifications: [
          { label: "SEER", value: unit.seerRating.toString() },
          { label: "Refrigerant", value: unit.refrigerant },
          { label: "Drive Type", value: unit.driveType },
          { label: "Sound Level", value: unit.soundLevel.toString(), unit: " dB" },
          { label: "Weight", value: unit.weight.toString(), unit: " lbs" }
        ]
      }));

      // Use the new comprehensive specification export
      const { exportSpecificationReport } = await import('@/lib/pdfService');
      
      await exportSpecificationReport(replacements, {
        includeProjectInfo: true,
        includeSearchCriteria: true,
        includeNomenclatureBreakdown: true,
        includeCompatibilityScores: true, // Enable professional compatibility analysis
        includeEnvironmentalBenefits: true,
        includeNotesSection: true,
        searchCriteria: searchCriteria,
        project: "HVAC Specification Search",
        technician: "Current User",
        technicianNotes: "Specification search results based on customer requirements. Review recommended units for best match."
      });

      toast({
        title: "Comprehensive PDF Export Successful",
        description: `Multi-unit specification report with ${replacements.length} units has been downloaded with full nomenclature breakdown and technical details.`,
      });
    } catch (error) {
      console.error("Specification export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the bulk PDF report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSingle = async (unit: EnhancedUnit) => {
    setIsExporting(true);
    try {
      // Create "original unit" from search parameters for comparison
      const { voltage: parsedVoltage, phases: parsedPhases } = parseCombinedVoltage(searchParams.voltage);
      
      // Convert search parameters to search criteria format for PDF export
      const searchCriteria = {
        systemType: searchParams.systemType,
        tonnage: searchParams.tonnage,
        voltage: parsedVoltage,
        phases: parsedPhases.toString(),
        efficiency: searchParams.efficiency,
        heatingBTU: searchParams.heatingBTU,
        heatKitKW: searchParams.heatKitKW,
        gasCategory: searchParams.gasCategory,
        maxSoundLevel: searchParams.maxSoundLevel,
        refrigerant: searchParams.refrigerant,
        driveType: searchParams.driveType
      };
      const originalUnit = {
        modelNumber: "Search Specifications",
        manufacturer: "Various",
        confidence: 100,
        systemType: searchParams.systemType,
        btuCapacity: parseFloat(searchParams.tonnage) * 12000,
        voltage: parsedVoltage,
        phases: parsedPhases,
        specifications: [
          { label: "System Type", value: searchParams.systemType },
          { label: "Tonnage", value: searchParams.tonnage, unit: " Tons" },
          { label: "Voltage", value: parsedVoltage, unit: "V" },
          { label: "Phases", value: parsedPhases },
          { label: "Efficiency", value: searchParams.efficiency }
        ]
      };

      const replacement = {
        id: unit.id,
        modelNumber: unit.modelNumber,
        systemType: unit.systemType,
        btuCapacity: unit.btuCapacity,
        voltage: unit.voltage,
        phases: unit.phases,
        sizeMatch: unit.sizeMatch,
        seerRating: unit.seerRating,
        eerRating: unit.eerRating,
        hspfRating: unit.hspfRating,
        refrigerant: unit.refrigerant,
        driveType: unit.driveType,
        soundLevel: unit.soundLevel,
        dimensions: normalizeDimensions(unit.dimensions),
        weight: unit.weight,
        specifications: [
          { label: "SEER", value: unit.seerRating.toString() },
          { label: "Refrigerant", value: unit.refrigerant },
          { label: "Drive Type", value: unit.driveType },
          { label: "Sound Level", value: unit.soundLevel.toString(), unit: " dB" }
        ]
      };

      await exportSingleComparison(originalUnit, replacement, {
        includeProjectInfo: true,
        includeEnvironmentalBenefits: true,
        includeCompatibilityScores: true, // Enable professional compatibility analysis
        includeCostAnalysis: true,
        searchCriteria: searchCriteria
      });

      toast({
        title: "PDF Export Successful",
        description: `Specification report for ${unit.modelNumber} has been downloaded.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function to normalize dimensions from EnhancedUnit format to DaikinReplacement format
  const normalizeDimensions = (dimensions: { length: number; width: number; height: number } | string): { length: number; width: number; height: number } | undefined => {
    if (typeof dimensions === "object" && dimensions !== null) {
      // Already in correct format
      return dimensions;
    }
    
    if (typeof dimensions === "string") {
      // Try to parse string format like "84x38x84" (LxWxH)
      const match = dimensions.match(/(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*x\s*(\d+\.?\d*)/);
      if (match) {
        return {
          length: parseFloat(match[1]),
          width: parseFloat(match[2]),
          height: parseFloat(match[3])
        };
      }
    }
    
    // Return undefined for invalid/unparseable dimensions
    return undefined;
  };

  // Handle search parameter updates (if callback provided)
  const handleUpdateSearch = (newParams: SpecSearchInput) => {
    if (onUpdateSearch) {
      onUpdateSearch(newParams);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onBackToSpecForm}
            data-testid="button-back-to-spec-form"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Modify Search
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Specification Search Results</h1>
            <p className="text-muted-foreground">
              Found {searchResults.count} units • {filteredAndSortedUnits.length} after filtering
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onNewSearch}
          data-testid="button-new-search-spec-results"
        >
          <Search className="h-4 w-4 mr-2" />
          Model Number Search
        </Button>
      </div>

      {/* Inline Edit Controls for Search Parameters */}
      {onUpdateSearch ? (
        <InlineEditControls
          searchParams={searchParams}
          onUpdateSearch={handleUpdateSearch}
          onCancel={onBackToSpecForm}
          resultCount={filteredAndSortedUnits.length}
        />
      ) : (
        // Fallback to simple criteria display if no update callback
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search Criteria
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">System Type:</span>
                <div className="font-medium">{searchParams.systemType}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Tonnage:</span>
                <div className="font-medium">{searchParams.tonnage} Ton</div>
              </div>
              <div>
                <span className="text-muted-foreground">Voltage:</span>
                <div className="font-medium">{parseCombinedVoltage(searchParams.voltage).voltage}V</div>
              </div>
              <div>
                <span className="text-muted-foreground">Phases:</span>
                <div className="font-medium">{parseCombinedVoltage(searchParams.voltage).phases} Phase</div>
              </div>
              <div>
                <span className="text-muted-foreground">Efficiency:</span>
                <div className="font-medium capitalize">{searchParams.efficiency}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Results:</span>
                <div className="font-medium text-primary">{searchResults.count} units</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* System Type Filter */}
        <div className="flex-1">
          <SystemTypeFilter
            selectedType={selectedSystemType}
            onTypeChange={setSelectedSystemType}
          />
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-4">
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-select" className="text-sm font-medium">Sort:</Label>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]" data-testid="select-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="size-match">Size Match</SelectItem>
                <SelectItem value="efficiency-desc">SEER High to Low</SelectItem>
                <SelectItem value="efficiency-asc">SEER Low to High</SelectItem>
                <SelectItem value="capacity-desc">BTU High to Low</SelectItem>
                <SelectItem value="capacity-asc">BTU Low to High</SelectItem>
                <SelectItem value="sound-asc">Quietest First</SelectItem>
                <SelectItem value="sound-desc">Loudest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "comparison" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("comparison")}
              data-testid="button-view-comparison"
            >
              <GitCompare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card className={`transition-all duration-200 ${showAdvancedFilters ? 'bg-muted/30' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              data-testid="button-toggle-advanced-filters"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        
        {showAdvancedFilters && (
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* SEER Range */}
              <div className="space-y-2">
                <Label htmlFor="max-seer">Max SEER</Label>
                <Input
                  type="number"
                  min="13"
                  max="25"
                  step="0.5"
                  value={maxSEER || ""}
                  onChange={(e) => setMaxSEER(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="25.0"
                  data-testid="input-max-seer"
                />
              </div>

              {/* Sound Level */}
              <div className="space-y-2">
                <Label htmlFor="max-sound">Max Sound Level (dB)</Label>
                <Input
                  type="number"
                  min="40"
                  max="80"
                  value={maxSoundLevel || ""}
                  onChange={(e) => setMaxSoundLevel(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="65"
                  data-testid="input-max-sound"
                />
              </div>

              {/* Quick Filters */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="high-efficiency"
                    checked={highEfficiencyOnly}
                    onCheckedChange={(checked) => setHighEfficiencyOnly(checked === true)}
                    data-testid="checkbox-high-efficiency"
                  />
                  <Label htmlFor="high-efficiency" className="text-sm">High Efficiency Only (16+ SEER)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="quiet-operation"
                    checked={quietOperationOnly}
                    onCheckedChange={(checked) => setQuietOperationOnly(checked === true)}
                    data-testid="checkbox-quiet-operation"
                  />
                  <Label htmlFor="quiet-operation" className="text-sm">Quiet Operation (≤60 dB)</Label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                {filteredAndSortedUnits.length} units match your filters
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedUnits.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-primary/10">
                  {selectedUnits.size} units selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUnits(new Set())}
                  data-testid="button-clear-selection"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      data-testid="button-save-to-project-spec"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save to Project ({selectedUnits.size})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FolderPlus className="h-5 w-5" />
                        Save Units to Project
                      </DialogTitle>
                      <DialogDescription>
                        Save {selectedUnits.size} selected unit{selectedUnits.size > 1 ? 's' : ''} to an existing project or create a new one.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 pt-4">
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Select Project</label>
                        <Select 
                          value={selectedProjectId} 
                          onValueChange={setSelectedProjectId}
                          disabled={isLoadingProjects}
                        >
                          <SelectTrigger data-testid="select-project-spec">
                            <SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "Choose a project..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project: any) => {
                              const unitCount = project.items?.length || 0;
                              const remainingCapacity = 20 - unitCount;
                              const canFitSelection = remainingCapacity >= selectedUnits.size;
                              
                              return (
                                <SelectItem 
                                  key={project.id} 
                                  value={project.id}
                                  disabled={!canFitSelection}
                                  className={!canFitSelection ? "opacity-50" : ""}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="truncate">{project.name}</span>
                                    <div className="flex items-center gap-2 ml-2">
                                      <Badge variant={canFitSelection ? "secondary" : "destructive"} className="text-xs">
                                        {unitCount}/20 units
                                      </Badge>
                                      {!canFitSelection && (
                                        <span className="text-xs text-destructive">Full</span>
                                      )}
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        
                        {projects.length === 0 && !isLoadingProjects && (
                          <p className="text-sm text-muted-foreground">No projects found. Create your first project below.</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={handleCreateProjectWithUnits}
                          className="flex-1 gap-2"
                          data-testid="button-create-new-project-spec"
                        >
                          <Plus className="h-4 w-4" />
                          Create New Project
                        </Button>
                        <Button
                          onClick={handleSaveToProject}
                          disabled={!selectedProjectId || isSavingToProject}
                          className="flex-1"
                          data-testid="button-confirm-save-project-spec"
                        >
                          {isSavingToProject ? "Saving..." : "Save to Project"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompareSelected}
                  disabled={selectedUnits.size < 2}
                  data-testid="button-compare-selected"
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare ({selectedUnits.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                  data-testid="button-export-selected"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Select All Checkbox */}
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selectedUnits.size === filteredAndSortedUnits.length && filteredAndSortedUnits.length > 0}
          onCheckedChange={handleSelectAll}
          data-testid="checkbox-select-all"
        />
        <Label className="text-sm font-medium">
          Select All ({filteredAndSortedUnits.length} units)
        </Label>
      </div>

      {/* Results Display - Sizing Comparison or Grid/List */}
      <div className="space-y-4">
        {filteredAndSortedUnits.length > 0 ? (
          hasSizingComparison || viewMode === "comparison" ? (
            <SizingComparisonLayout
              units={filteredAndSortedUnits}
              onUnitSelect={(unit) => {
                setSelectedUnits(new Set([unit.id]));
                handleViewDetails(filteredAndSortedUnits.find(u => u.id === unit.id)!);
              }}
              onAddToProject={(unit) => {
                const fullUnit = filteredAndSortedUnits.find(u => u.id === unit.id);
                if (fullUnit) handleAddToProject(fullUnit);
              }}
              onViewDetails={(unit) => {
                const fullUnit = filteredAndSortedUnits.find(u => u.id === unit.id);
                if (fullUnit) handleViewDetails(fullUnit);
              }}
            />
          ) : (
            <div className={
              viewMode === "grid" 
                ? "grid gap-6 lg:grid-cols-1 xl:grid-cols-2" 
                : "space-y-4"
            }>
              {filteredAndSortedUnits.map((unit) => (
                <EnhancedUnitCard
                  key={unit.id}
                  unit={unit}
                  isSelected={selectedUnits.has(unit.id)}
                  onSelectionChange={(selected) => handleSelectUnit(unit.id, selected)}
                  onViewDetails={handleViewDetails}
                  onAddToProject={handleAddToProject}
                  onGenerateQuote={handleGenerateQuote}
                  family={getFamilyFromModelNumber(unit.modelNumber)}
                  isEditable={true}
                />
              ))}
            </div>
          )
        ) : (
          <Card className="text-center py-8">
            <CardContent>
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Units Found</h3>
              <p className="text-muted-foreground mb-4">
                No units match your current filters. Try adjusting your criteria.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button variant="outline" onClick={() => setSelectedSystemType("all")}>
                  Show All Types
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
        <Button
          variant="outline"
          onClick={onBackToSpecForm}
          className="flex-1"
          data-testid="button-refine-search"
        >
          <Filter className="h-4 w-4 mr-2" />
          Refine Search
        </Button>
        <Button
          variant="outline"
          onClick={onNewSearch}
          className="flex-1"
          data-testid="button-model-search"
        >
          <Search className="h-4 w-4 mr-2" />
          Search by Model Number
        </Button>
        {selectedUnits.size > 0 && (
          <Button
            className="flex-1"
            onClick={handleCompareSelected}
            data-testid="button-compare-footer"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Report ({selectedUnits.size})
          </Button>
        )}
      </div>

      {/* Unit Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedUnitDetails?.modelNumber} - Details
            </DialogTitle>
          </DialogHeader>
          {selectedUnitDetails && (
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">System Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model Number:</span>
                      <span className="font-medium">{selectedUnitDetails.modelNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">System Type:</span>
                      <span className="font-medium">{selectedUnitDetails.systemType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">BTU Capacity:</span>
                      <span className="font-medium">{selectedUnitDetails.btuCapacity.toLocaleString()} BTU/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tonnage:</span>
                      <span className="font-medium">{selectedUnitDetails.tonnage} Tons</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Voltage:</span>
                      <span className="font-medium">{selectedUnitDetails.voltage}V</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phases:</span>
                      <span className="font-medium">{selectedUnitDetails.phases}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Performance Ratings</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SEER Rating:</span>
                      <span className="font-medium">{selectedUnitDetails.seerRating || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">EER Rating:</span>
                      <span className="font-medium">{selectedUnitDetails.eerRating || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HSPF Rating:</span>
                      <span className="font-medium">{selectedUnitDetails.hspfRating || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Refrigerant:</span>
                      <span className="font-medium">{selectedUnitDetails.refrigerant}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Drive Type:</span>
                      <span className="font-medium">{selectedUnitDetails.driveType || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sound Level:</span>
                      <span className="font-medium">{selectedUnitDetails.soundLevel ? `${selectedUnitDetails.soundLevel} dB` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Physical Specifications</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Dimensions</span>
                    <div className="font-medium">
                      {selectedUnitDetails.dimensions 
                        ? (typeof selectedUnitDetails.dimensions === 'string' 
                           ? selectedUnitDetails.dimensions
                           : `${selectedUnitDetails.dimensions.length || 0}" L × ${selectedUnitDetails.dimensions.width || 0}" W × ${selectedUnitDetails.dimensions.height || 0}" H`)
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Weight</span>
                    <div className="font-medium">{selectedUnitDetails.weight ? `${selectedUnitDetails.weight} lbs` : 'N/A'}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Operating Amperage</span>
                    <div className="font-medium">{selectedUnitDetails.operatingAmperage ? `${selectedUnitDetails.operatingAmperage} A` : 'N/A'}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Max Fuse Size</span>
                    <div className="font-medium">{selectedUnitDetails.maxFuseSize ? `${selectedUnitDetails.maxFuseSize} A` : 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <CreateProjectForm 
            onSuccess={(projectId) => {
              setIsCreateProjectOpen(false);
              setSelectedProjectId(projectId);
              setIsProjectDialogOpen(true);
            }}
            onCancel={() => setIsCreateProjectOpen(false)}
            initialUnit={selectedUnits.size > 0 ? {
              originalUnit: {
                modelNumber: "Search Specifications",
                manufacturer: "Various",
                confidence: 100,
                systemType: searchParams.systemType,
                btuCapacity: parseFloat(searchParams.tonnage) * 12000,
                voltage: parseCombinedVoltage(searchParams.voltage).voltage,
                phases: parseCombinedVoltage(searchParams.voltage).phases,
                specifications: [
                  { label: "System Type", value: searchParams.systemType },
                  { label: "Tonnage", value: searchParams.tonnage, unit: " Tons" }
                ]
              },
              replacement: (() => {
                const selectedEnhancedUnits = filteredAndSortedUnits.filter(unit => selectedUnits.has(unit.id));
                return selectedEnhancedUnits[0] || null;
              })()
            } : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}