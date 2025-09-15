import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EditableSpecificationForm from "./EditableSpecificationForm";
import { 
  Thermometer, 
  Zap, 
  Gauge, 
  Fan, 
  Ruler, 
  Weight, 
  Volume2, 
  Snowflake, 
  Wrench,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  FileText,
  Star,
  Edit2,
  Code2,
  Settings,
  Loader2,
  AlertCircle,
  Activity,
  Settings2,
  Waves,
  Droplets,
  Wind,
  MonitorSpeaker,
  Cpu,
  ClipboardList,
  Map,
  Cog,
  Info
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRealTimeModelBuilder } from "@/hooks/useModelBuilder";
import type { BuildModelRequest, DaikinFamilyKeys } from "@shared/schema";

// Normalize unit data to handle both nested and flat structures
function normalizeUnit(unit: EnhancedUnit): EnhancedUnit & {
  seerRating: number;
  eerRating?: number;
  hspfRating?: number;
} {
  return {
    ...unit,
    seerRating: unit.performanceRatings?.seerRating || (unit as any).seerRating || 14,
    eerRating: unit.performanceRatings?.eerRating || (unit as any).eerRating,
    hspfRating: unit.performanceRatings?.hspfRating || (unit as any).hspfRating
  };
}

// Factory-installed option interface
interface FactoryOption {
  category: string;
  code: string;
  description: string;
  priceAdder?: number;
  availability: "Standard" | "Optional" | "N/A";
}

// Field accessory interface
interface FieldAccessory {
  category: string;
  code: string;
  description: string;
  complexity: "Easy" | "Moderate" | "Professional Required";
  compatible: boolean;
}

// Enhanced unit interface with comprehensive technical specifications
interface EnhancedUnit {
  id: string;
  modelNumber: string;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  btuCapacity: number;
  tonnage: string;
  voltage: string;
  phases: string;
  sizeMatch: "smaller" | "direct" | "larger";
  
  // Comprehensive Performance Ratings
  performanceRatings: {
    // Standard Ratings
    seerRating: number;
    seer2Rating?: number;
    eerRating?: number;
    eer2Rating?: number;
    hspfRating?: number;
    hspf2Rating?: number;
    
    // Advanced Commercial Ratings
    ieerRating?: number; // Integrated Energy Efficiency Ratio
    iplvRating?: number; // Integrated Part Load Value
    copRating?: number; // Coefficient of Performance
    
    // Part Load Performance
    partLoadEfficiency?: {
      at25Percent: number;
      at50Percent: number;
      at75Percent: number;
      at100Percent: number;
    };
    
    // Temperature-based performance
    capacityRetention?: {
      at5F: number; // % capacity at 5°F for heat pumps
      at17F: number; // % capacity at 17°F for heat pumps
    };
  };
  
  // Complete Physical Specifications
  physicalSpecs: {
    dimensions: {
      length: number; // inches
      width: number;
      height: number;
    };
    weight: {
      operating: number; // lbs
      shipping: number;
    };
    clearances: {
      sides: number; // inches
      back: number;
      front: number;
      top: number;
    };
    serviceAccess: {
      controlPanel: string; // "Front", "Side", "Top"
      refrigerantConnections: string;
      electricalConnections: string;
    };
    footprint: {
      area: number; // square feet
      foundation: string; // "Concrete pad", "Roof curb", etc.
    };
  };
  
  // Comprehensive Electrical Specifications
  electricalSpecs: {
    // Operating Characteristics
    operatingAmperage: {
      cooling: {
        rla: number; // Rated Load Amps
        mca: number; // Minimum Circuit Ampacity
        lra: number; // Locked Rotor Amps
      };
      heating?: {
        rla: number;
        mca: number;
        lra: number;
      };
      fan: {
        fla: number; // Full Load Amps
      };
    };
    
    // Protection Requirements
    protection: {
      maxFuseSize: number;
      maxBreaker: number;
      minimumWireSize: string; // "12 AWG", "10 AWG", etc.
      groundWireSize: string;
    };
    
    // Disconnect and Control
    disconnect: {
      required: boolean;
      ampRating: number;
      type: string; // "Fused", "Non-fused", "GFCI"
    };
    
    // Power Requirements
    powerConsumption: {
      cooling: {
        fullLoad: number; // kW
        partLoad: number;
      };
      heating?: {
        fullLoad: number;
        partLoad: number;
      };
      standby: number; // Watts
    };
  };
  
  // Airflow and Fan Performance
  airflowSpecs: {
    // Cooling Airflow
    coolingAirflow: {
      nominalCfm: number;
      cfmPerTon: number;
      externalStaticPressure: {
        standard: number; // inches w.c.
        maximum: number;
      };
    };
    
    // Heating Airflow (if applicable)
    heatingAirflow?: {
      nominalCfm: number;
      temperatureRise: {
        minimum: number; // °F
        maximum: number;
      };
    };
    
    // Fan Performance
    fanSpecs: {
      type: string; // "Centrifugal", "Axial", "Mixed Flow"
      speed: {
        low?: number; // RPM
        medium?: number;
        high: number;
      };
      motorHp: number;
      bearingType: string;
    };
    
    // Performance Curves
    performanceCurve?: {
      cfmAtStaticPressures: Array<{
        staticPressure: number; // inches w.c.
        cfm: number;
        bhp: number; // Brake horsepower
      }>;
    };
  };
  
  // Comprehensive Sound Data
  soundSpecs: {
    // Overall Sound Levels
    soundPower: {
      cooling: number; // dB(A)
      heating?: number;
    };
    soundPressure: {
      cooling: number; // dB(A) at 10 feet
      heating?: number;
    };
    
    // Octave Band Analysis
    octaveBands?: {
      cooling: {
        hz63: number;
        hz125: number;
        hz250: number;
        hz500: number;
        hz1000: number;
        hz2000: number;
        hz4000: number;
        hz8000: number;
      };
      heating?: {
        hz63: number;
        hz125: number;
        hz250: number;
        hz500: number;
        hz1000: number;
        hz2000: number;
        hz4000: number;
        hz8000: number;
      };
    };
    
    // Sound Attenuation Options
    attenuationOptions?: Array<{
      type: string; // "Compressor blanket", "Fan silencer"
      reduction: number; // dB reduction
      frequencies: string; // "Low", "Mid", "High", "Broadband"
    }>;
  };
  
  // Refrigerant System Specifications
  refrigerantSpecs: {
    type: string; // "R-410A", "R-32", "R-454B"
    charge: {
      factory: number; // lbs
      field: number; // Additional field charge if needed
      total: number;
    };
    
    // Connection Sizes
    connections: {
      liquid: {
        size: string; // "3/8\"", "1/2\"", etc.
        type: string; // "Sweat", "Flare", "Brazen"
      };
      suction: {
        size: string;
        type: string;
      };
      hotGas?: {
        size: string;
        type: string;
      };
    };
    
    // Operating Pressures
    operatingPressures: {
      cooling: {
        lowSide: { min: number; max: number }; // psig
        highSide: { min: number; max: number };
      };
      heating?: {
        lowSide: { min: number; max: number };
        highSide: { min: number; max: number };
      };
    };
    
    // System Components
    systemComponents: {
      expansionDevice: string; // "TXV", "EEV", "Capillary"
      filterDrier: string;
      sightGlass: boolean;
      serviceValves: boolean;
    };
  };
  
  // System Features and Controls
  systemFeatures: {
    // Staging and Capacity Control
    capacity: {
      coolingStages: number;
      heatingStages?: number;
      modulation: boolean; // Variable capacity
      turndownRatio?: number; // For modulating units
    };
    
    // Control Systems
    controls: {
      type: string; // "Electromechanical", "DDC", "Smart"
      interface: string; // "Thermostat", "BMS", "App"
      features: string[];
      communicationProtocols?: string[]; // "BACnet", "Modbus", "LonWorks"
    };
    
    // Indoor Air Quality Features
    iaqFeatures: {
      filtration: {
        standard: string; // "1-inch throwaway", "MERV 8"
        optional: string[]; // Available upgrades
      };
      ventilation: {
        economizer: boolean;
        freshAirIntake: boolean;
        erv: boolean; // Energy Recovery Ventilation
        demandControlled: boolean;
      };
      airPurification?: {
        uvLights: boolean;
        ionization: boolean;
        photocatalyticOxidation: boolean;
      };
    };
    
    // Advanced Features
    advancedFeatures: {
      diagnostics: string[]; // "Fault detection", "Performance monitoring"
      connectivity: string[]; // "Wi-Fi", "Ethernet", "Cellular"
      zoning: boolean;
      scheduling: boolean;
      loadShedding: boolean;
    };
  };
  
  // Operating Conditions and Limits
  operatingConditions: {
    temperatureRange: {
      cooling: { min: number; max: number }; // °F ambient
      heating?: { min: number; max: number };
    };
    altitudeLimit: number; // feet above sea level
    humidityRange: {
      min: number; // % RH
      max: number;
    };
    specialEnvironments?: {
      coastal: boolean;
      industrial: boolean;
      corrosiveAtmosphere: boolean;
    };
  };
  
  // Technical specifications
  refrigerant: string;
  driveType: string;
  coolingStages: number;
  heatingStages?: number;
  soundLevel: number;
  
  // Legacy dimensions for backward compatibility
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight: number;
  
  // Legacy electrical for backward compatibility
  operatingAmperage: number;
  maxFuseSize: number;
  
  // Advanced specifications
  temperatureRange: {
    cooling: { min: number; max: number };
    heating?: { min: number; max: number };
  };
  controlsType: string;
  coilType: string;
  
  // Factory options and accessories
  factoryOptions: FactoryOption[];
  fieldAccessories: FieldAccessory[];
}

interface EnhancedUnitCardProps {
  unit: EnhancedUnit;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onViewDetails: (unit: EnhancedUnit) => void;
  onAddToProject?: (unit: EnhancedUnit) => void;
  onGenerateQuote?: (unit: EnhancedUnit) => void;
  // Enhanced editable features
  isEditable?: boolean;
  family?: DaikinFamilyKeys;
  onSpecificationUpdate?: (newModelNumber: string, specifications: any) => void;
  onSave?: (formData: any) => void;
  // Accessory management
  showAccessories?: boolean;
  selectedFactoryOptions?: string[];
  selectedFieldAccessories?: string[];
  onFactoryOptionsChange?: (selectedOptions: string[]) => void;
  onFieldAccessoriesChange?: (selectedAccessories: string[]) => void;
}

export default function EnhancedUnitCard({
  unit,
  isSelected,
  onSelectionChange,
  onViewDetails,
  onAddToProject,
  onGenerateQuote,
  isEditable = false,
  family,
  onSpecificationUpdate,
  onSave,
  showAccessories = false,
  selectedFactoryOptions = [],
  selectedFieldAccessories = [],
  onFactoryOptionsChange,
  onFieldAccessoriesChange
}: EnhancedUnitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("performance");
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Nomenclature builder state
  const [nomenclatureSegments, setNomenclatureSegments] = useState<Array<{
    position: string;
    code: string;
    description: string;
    options: Array<{ value: string; description: string; }>;
    selectedValue: string;
  }>>([]);
  const [dynamicModelNumber, setDynamicModelNumber] = useState(unit.modelNumber);
  const [modelBuildError, setModelBuildError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  
  const modelBuilder = useRealTimeModelBuilder();

  const sizeMatchConfig = {
    smaller: {
      label: "Size Smaller",
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    },
    direct: {
      label: "Direct Match",
      color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    },
    larger: {
      label: "Size Larger", 
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    }
  };

  const systemTypeColors = {
    "Heat Pump": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "Gas/Electric": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", 
    "Straight A/C": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  };

  const getEfficiencyBadge = (modelNumber: string) => {
    // Determine efficiency from model number prefix (position 1: S=Standard, H=High efficiency)
    const efficiencyCode = modelNumber.charAt(1) || "S";
    if (efficiencyCode === "H") {
      return { label: "High Efficiency", color: "bg-green-500 text-white" };
    } else {
      return { label: "Standard Efficiency", color: "bg-blue-500 text-white" };
    }
  };

  const normalizedUnit = normalizeUnit(unit);
  const efficiencyBadge = getEfficiencyBadge(normalizedUnit.modelNumber);

  // Group factory options by category
  const factoryOptionsByCategory = unit.factoryOptions.reduce((acc, option) => {
    if (!acc[option.category]) acc[option.category] = [];
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, FactoryOption[]>);

  // Group field accessories by category
  const fieldAccessoriesByCategory = unit.fieldAccessories.reduce((acc, accessory) => {
    if (!acc[accessory.category]) acc[accessory.category] = [];
    acc[accessory.category].push(accessory);
    return acc;
  }, {} as Record<string, FieldAccessory[]>);

  const handleToggleEdit = () => {
    setIsEditMode(!isEditMode);
  };

  const handleSpecificationUpdate = (newModelNumber: string, specifications: any) => {
    onSpecificationUpdate?.(newModelNumber, specifications);
  };

  const handleSave = (formData: any) => {
    onSave?.(formData);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  // Initialize nomenclature segments based on the current model number
  useEffect(() => {
    if (unit.modelNumber && family) {
      const segments = getNomenclatureBreakdown(unit.modelNumber);
      setNomenclatureSegments(segments);
      setDynamicModelNumber(unit.modelNumber);
    }
  }, [unit.modelNumber, family]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Get nomenclature breakdown for Daikin model numbers (All 24 positions)
  const getNomenclatureBreakdown = (model: string) => {
    if (!model || !family) return [];
    
    // Determine system type from position 3 for conditional options
    const systemTypeCode = model.charAt(2) || "C";
    const efficiencyCode = model.charAt(1) || "S";
    const isGasElectric = systemTypeCode === "G";
    const isHeatPump = systemTypeCode === "H";
    const isStraightAC = systemTypeCode === "C";
    const isHighEfficiency = efficiencyCode === "H";
    const isStandardEfficiency = efficiencyCode === "S";
    
    // Family-specific logic for available options
    const getAvailableCapacities = (): Array<{ value: string; description: string }> => {
      const allCapacities = [
        { value: "036", description: "36,000 BTU/h (3 Ton)" },
        { value: "048", description: "48,000 BTU/h (4 Ton)" },
        { value: "060", description: "60,000 BTU/h (5 Ton)" },
        { value: "072", description: "72,000 BTU/h (6 Ton)" },
        { value: "090", description: "90,000 BTU/h (7.5 Ton)" },
        { value: "102", description: "102,000 BTU/h (8.5 Ton)" },
        { value: "120", description: "120,000 BTU/h (10 Ton)" },
        { value: "150", description: "150,000 BTU/h (12.5 Ton)" },
        { value: "180", description: "180,000 BTU/h (15 Ton)" },
        { value: "240", description: "240,000 BTU/h (20 Ton)" },
        { value: "300", description: "300,000 BTU/h (25 Ton)" }
      ];
      
      // Filter based on family constraints
      if (family === "DHH" || (family.startsWith("DSH") && family.includes("3to6"))) {
        return allCapacities.filter(cap => ["036", "048", "060", "072"].includes(cap.value));
      } else if (family === "DHC" || family === "DHG") {
        return allCapacities.filter(cap => !["240", "300"].includes(cap.value));
      }
      
      return allCapacities;
    };

    const getAvailableVoltages = (): Array<{ value: string; description: string }> => {
      const allVoltages = [
        { value: "1", description: "208/230V 1φ" },
        { value: "3", description: "208/230V 3φ" },
        { value: "4", description: "460V 3φ" },
        { value: "7", description: "575V 3φ" }
      ];
      
      // High efficiency families typically don't support single phase
      if (isHighEfficiency) {
        return allVoltages.filter(v => v.value !== "1");
      }
      
      // DSH 7.5-10T doesn't support single phase
      if (family === "DSH_7p5to10") {
        return allVoltages.filter(v => v.value !== "1");
      }
      
      return allVoltages;
    };

    const getAvailableControls = (): Array<{ value: string; description: string }> => {
      const allControls = [
        { value: "A", description: "Electromechanical" },
        { value: "B", description: "DDC/BACnet (Standard families)" },
        { value: "C", description: "DDC/BACnet (High-efficiency families)" }
      ];
      
      // High efficiency families typically use DDC/BACnet "C"
      if (isHighEfficiency) {
        return allControls.filter(c => c.value === "C");
      }
      
      // Standard efficiency can use A or B
      return allControls.filter(c => c.value !== "C");
    };
    
    // Pad model to 24 characters if shorter
    const paddedModel = model.padEnd(24, 'X');
    
    return [
      {
        position: "Position 1",
        code: paddedModel.charAt(0) || "D",
        description: "Manufacturer",
        options: [{ value: "D", description: "Daikin" }],
        selectedValue: paddedModel.charAt(0) || "D"
      },
      {
        position: "Position 2", 
        code: paddedModel.charAt(1) || "S",
        description: "Efficiency Level",
        options: [
          { value: "S", description: "Standard Efficiency" },
          { value: "H", description: "High Efficiency" }
        ],
        selectedValue: paddedModel.charAt(1) || "S"
      },
      {
        position: "Position 3",
        code: paddedModel.charAt(2) || "C", 
        description: "System Type",
        options: [
          { value: "C", description: "Straight A/C" },
          { value: "G", description: "Gas/Electric" },
          { value: "H", description: "Heat Pump" }
        ],
        selectedValue: paddedModel.charAt(2) || "C"
      },
      {
        position: "Position 4-6",
        code: paddedModel.substring(3, 6) || "036",
        description: "Nominal Capacity (MBH)",
        options: getAvailableCapacities(),
        selectedValue: paddedModel.substring(3, 6) || "036"
      },
      {
        position: "Position 7",
        code: paddedModel.charAt(6) || "3",
        description: "Voltage/Phase",
        options: getAvailableVoltages(),
        selectedValue: paddedModel.charAt(6) || "3"
      },
      {
        position: "Position 8",
        code: paddedModel.charAt(7) || "D",
        description: "Fan/Drive Type", 
        options: [
          { value: "D", description: "Direct Drive - Standard Static" },
          { value: "L", description: "Direct Drive - Medium Static" },
          { value: "W", description: "Direct Drive - High Static" }
        ],
        selectedValue: paddedModel.charAt(7) || "D"
      },
      {
        position: "Position 9-11",
        code: paddedModel.substring(8, 11) || (isGasElectric ? "100" : isHeatPump ? "010" : "XXX"),
        description: isGasElectric ? "Gas Heat (MBH)" : isHeatPump ? "Electric Heat (kW)" : "Heat Field",
        options: isGasElectric ? [
          { value: "045", description: "45,000 BTU/h Gas" },
          { value: "060", description: "60,000 BTU/h Gas" },
          { value: "070", description: "70,000 BTU/h Gas" },
          { value: "080", description: "80,000 BTU/h Gas" },
          { value: "090", description: "90,000 BTU/h Gas" },
          { value: "100", description: "100,000 BTU/h Gas" },
          { value: "115", description: "115,000 BTU/h Gas" },
          { value: "125", description: "125,000 BTU/h Gas" },
          { value: "130", description: "130,000 BTU/h Gas" },
          { value: "140", description: "140,000 BTU/h Gas" },
          { value: "150", description: "150,000 BTU/h Gas" },
          { value: "180", description: "180,000 BTU/h Gas" },
          { value: "210", description: "210,000 BTU/h Gas" },
          { value: "225", description: "225,000 BTU/h Gas" },
          { value: "240", description: "240,000 BTU/h Gas" },
          { value: "260", description: "260,000 BTU/h Gas" },
          { value: "350", description: "350,000 BTU/h Gas" },
          { value: "360", description: "360,000 BTU/h Gas" },
          { value: "400", description: "400,000 BTU/h Gas" },
          { value: "480", description: "480,000 BTU/h Gas" }
        ] : isHeatPump ? [
          { value: "XXX", description: "No Electric Heat" },
          { value: "005", description: "5 kW Electric Heat" },
          { value: "010", description: "10 kW Electric Heat" },
          { value: "015", description: "15 kW Electric Heat" },
          { value: "020", description: "20 kW Electric Heat" },
          { value: "030", description: "30 kW Electric Heat" },
          { value: "045", description: "45 kW Electric Heat" },
          { value: "060", description: "60 kW Electric Heat" },
          { value: "075", description: "75 kW Electric Heat" },
          { value: "S05", description: "5 kW SCR Electric Heat" },
          { value: "S10", description: "10 kW SCR Electric Heat" },
          { value: "S15", description: "15 kW SCR Electric Heat" },
          { value: "S20", description: "20 kW SCR Electric Heat" },
          { value: "S25", description: "25 kW SCR Electric Heat" },
          { value: "S30", description: "30 kW SCR Electric Heat" },
          { value: "S45", description: "45 kW SCR Electric Heat" },
          { value: "S60", description: "60 kW SCR Electric Heat" },
          { value: "S75", description: "75 kW SCR Electric Heat" }
        ] : [
          { value: "XXX", description: "No Heat (Straight A/C)" }
        ],
        selectedValue: paddedModel.substring(8, 11) || (isGasElectric ? "100" : isHeatPump ? "010" : "XXX")
      },
      {
        position: "Position 12",
        code: paddedModel.charAt(11) || "A",
        description: "Controls Type",
        options: getAvailableControls(),
        selectedValue: paddedModel.charAt(11) || "A"
      },
      {
        position: "Position 13",
        code: paddedModel.charAt(12) || "A",
        description: "Refrigeration System",
        options: [
          { value: "A", description: "Single stage" },
          { value: "C", description: "Two stage" },
          { value: "F", description: "Two stage + HGRH + Low Ambient" },
          { value: "G", description: "Single stage + Low Ambient" },
          { value: "H", description: "Two stage + Low Ambient" }
        ],
        selectedValue: paddedModel.charAt(12) || "A"
      },
      {
        position: "Position 14",
        code: paddedModel.charAt(13) || "X",
        description: "Heat Exchanger",
        options: isGasElectric ? [
          { value: "A", description: "Aluminized Steel" },
          { value: "S", description: "Stainless Steel" },
          { value: "U", description: "Ultra Low NOx" }
        ] : [
          { value: "X", description: "N/A (Non-gas unit)" }
        ],
        selectedValue: paddedModel.charAt(13) || "X"
      },
      {
        position: "Position 15",
        code: paddedModel.charAt(14) || "X",
        description: "Factory Option 1",
        options: [
          { value: "X", description: "No option" },
          { value: "H", description: "Electric Heat Kit" },
          { value: "D", description: "Disconnect Switch" },
          { value: "C", description: "Current Monitoring" },
          { value: "L", description: "Low Pressure Switch" },
          { value: "P", description: "High Pressure Switch" },
          { value: "T", description: "Control Circuit Transformer" },
          { value: "F", description: "Time Delay Fuses" },
          { value: "S", description: "Short Cycle Protection" },
          { value: "V", description: "VFD Ready" },
          { value: "M", description: "Phase Monitor" }
        ],
        selectedValue: paddedModel.charAt(14) || "X"
      },
      {
        position: "Position 16",
        code: paddedModel.charAt(15) || "X",
        description: "Factory Option 2",
        options: [
          { value: "X", description: "No option" },
          { value: "A", description: "APP Connection Module" },
          { value: "B", description: "Building Automation Interface" },
          { value: "D", description: "Demand Control Ventilation" },
          { value: "E", description: "Economizer Integration" },
          { value: "M", description: "Modbus Communication" },
          { value: "L", description: "LonWorks Communication" },
          { value: "N", description: "BACnet/IP Interface" },
          { value: "T", description: "Temperature Management" },
          { value: "S", description: "7-Day Scheduling" },
          { value: "R", description: "Alarm Relay Package" },
          { value: "C", description: "LCD Display Panel" }
        ],
        selectedValue: paddedModel.charAt(15) || "X"
      },
      {
        position: "Position 17",
        code: paddedModel.charAt(16) || "X",
        description: "Factory Option 3",
        options: [
          { value: "X", description: "No option" },
          { value: "L", description: "Low-Loss Fitting Kit" },
          { value: "S", description: "Sight Glass & Filter Drier" },
          { value: "P", description: "Pump Down Control" },
          { value: "R", description: "Refrigerant Monitor" },
          { value: "G", description: "Gas Leak Detection" },
          { value: "T", description: "Temperature Sensors" },
          { value: "H", description: "Humidity Control" },
          { value: "A", description: "Air Quality Monitor" },
          { value: "F", description: "Filter Status Monitor" }
        ],
        selectedValue: paddedModel.charAt(16) || "X"
      },
      {
        position: "Position 18",
        code: paddedModel.charAt(17) || "X",
        description: "Factory Option 4",
        options: [
          { value: "X", description: "No option" },
          { value: "Z", description: "Zone Control Ready" },
          { value: "V", description: "Ventilation Package" },
          { value: "E", description: "Energy Recovery" },
          { value: "C", description: "CO2 Monitoring" },
          { value: "I", description: "IAQ Package" },
          { value: "F", description: "HEPA Filtration" },
          { value: "U", description: "UV-C Air Purification" },
          { value: "O", description: "Outdoor Air Damper" },
          { value: "R", description: "Relief Air Package" }
        ],
        selectedValue: paddedModel.charAt(17) || "X"
      },
      {
        position: "Position 19",
        code: paddedModel.charAt(18) || "X",
        description: "Factory Option 5",
        options: [
          { value: "X", description: "No option" },
          { value: "W", description: "Weather Shield" },
          { value: "S", description: "Sound Attenuator" },
          { value: "V", description: "Vibration Isolators" },
          { value: "C", description: "Coil Coating" },
          { value: "H", description: "Hail Guard" },
          { value: "F", description: "Freeze Protection" },
          { value: "L", description: "Low Ambient Kit" },
          { value: "E", description: "Extreme Weather Package" },
          { value: "M", description: "Marine Environment Package" }
        ],
        selectedValue: paddedModel.charAt(18) || "X"
      },
      {
        position: "Position 20",
        code: paddedModel.charAt(19) || "X",
        description: "Factory Option 6",
        options: [
          { value: "X", description: "No option" },
          { value: "M", description: "Maintenance Package" },
          { value: "D", description: "Diagnostic Package" },
          { value: "R", description: "Remote Monitoring" },
          { value: "T", description: "Trending Package" },
          { value: "A", description: "Analytics Package" },
          { value: "P", description: "Predictive Maintenance" },
          { value: "C", description: "Commissioning Tools" },
          { value: "S", description: "Startup Package" },
          { value: "W", description: "Warranty Extension" }
        ],
        selectedValue: paddedModel.charAt(19) || "X"
      },
      {
        position: "Position 21",
        code: paddedModel.charAt(20) || "X",
        description: "Field Accessory 1",
        options: [
          { value: "X", description: "No accessory" },
          { value: "F", description: "Standard Filter Package" },
          { value: "H", description: "High-Efficiency Filter" },
          { value: "M", description: "MERV 13 Filter" },
          { value: "E", description: "HEPA Filter" },
          { value: "C", description: "Carbon Filter" },
          { value: "U", description: "UV-C Light" },
          { value: "I", description: "Ionizer" },
          { value: "P", description: "Photocatalytic Oxidation" },
          { value: "O", description: "Ozone Generator" }
        ],
        selectedValue: paddedModel.charAt(20) || "X"
      },
      {
        position: "Position 22",
        code: paddedModel.charAt(21) || "X",
        description: "Field Accessory 2",
        options: [
          { value: "X", description: "No accessory" },
          { value: "T", description: "Programmable Thermostat" },
          { value: "S", description: "Smart WiFi Thermostat" },
          { value: "Z", description: "Zoning Control" },
          { value: "H", description: "Humidifier Control" },
          { value: "D", description: "Dehumidifier Control" },
          { value: "V", description: "Ventilation Control" },
          { value: "E", description: "Energy Management" },
          { value: "R", description: "Remote Control" },
          { value: "A", description: "Automation Interface" }
        ],
        selectedValue: paddedModel.charAt(21) || "X"
      },
      {
        position: "Position 23",
        code: paddedModel.charAt(22) || "X",
        description: "Field Accessory 3",
        options: [
          { value: "X", description: "No accessory" },
          { value: "O", description: "Outdoor Sensor" },
          { value: "R", description: "Return Air Sensor" },
          { value: "H", description: "Humidity Sensor" },
          { value: "P", description: "Pressure Sensor" },
          { value: "C", description: "CO2 Sensor" },
          { value: "I", description: "IAQ Sensor" },
          { value: "M", description: "Motion Sensor" },
          { value: "L", description: "Light Sensor" },
          { value: "S", description: "Sound Sensor" }
        ],
        selectedValue: paddedModel.charAt(22) || "X"
      },
      {
        position: "Position 24",
        code: paddedModel.charAt(23) || "X",
        description: "Field Accessory 4",
        options: [
          { value: "X", description: "No accessory" },
          { value: "D", description: "Ductwork Package" },
          { value: "I", description: "Insulation Kit" },
          { value: "T", description: "Transition Kit" },
          { value: "B", description: "Boot Set" },
          { value: "F", description: "Flexible Connector" },
          { value: "E", description: "Electrical Kit" },
          { value: "W", description: "Wiring Harness" },
          { value: "C", description: "Conduit Kit" },
          { value: "M", description: "Mounting Hardware" }
        ],
        selectedValue: paddedModel.charAt(23) || "X"
      }
    ];
  };

  // Handle nomenclature segment changes with real-time model building
  const handleSegmentChange = (segmentIndex: number, newValue: string) => {
    const updatedSegments = [...nomenclatureSegments];
    updatedSegments[segmentIndex].selectedValue = newValue;
    updatedSegments[segmentIndex].code = newValue;
    
    setNomenclatureSegments(updatedSegments);
    
    // Convert nomenclature segments to BuildModelRequest
    const buildRequest = convertSegmentsToBuildRequest(updatedSegments);
    
    if (buildRequest) {
      setModelBuildError(null);
      
      // Clear any existing cleanup function
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      
      // Use the real-time model builder with proper cleanup
      cleanupRef.current = modelBuilder.buildModel(buildRequest, (response) => {
        if (response && response.success && response.result) {
          const newModelNumber = response.result.model;
          setDynamicModelNumber(newModelNumber);
          
          // Trigger specification update callback if provided
          if (onSpecificationUpdate) {
            onSpecificationUpdate(newModelNumber, response.result.specifications);
          }
        } else {
          // Fallback to manual concatenation for all 24 positions
          const fallbackModel = buildManualModelNumber(updatedSegments);
          setDynamicModelNumber(fallbackModel);
          setModelBuildError(response?.errors?.[0] || "Model built with fallback method");
        }
      });
    }
  };

  // Build complete 24-character model number from segments
  const buildManualModelNumber = (segments: typeof nomenclatureSegments): string => {
    if (segments.length < 24) return "";
    
    let model = "";
    
    // Position 1: Manufacturer (1 char)
    model += segments[0]?.selectedValue || "D";
    
    // Position 2: Efficiency (1 char)
    model += segments[1]?.selectedValue || "S";
    
    // Position 3: System Type (1 char)
    model += segments[2]?.selectedValue || "C";
    
    // Position 4-6: Capacity (3 chars)
    model += segments[3]?.selectedValue || "036";
    
    // Position 7: Voltage (1 char)
    model += segments[4]?.selectedValue || "3";
    
    // Position 8: Fan Drive (1 char)
    model += segments[5]?.selectedValue || "D";
    
    // Position 9-11: Heat Field (3 chars)
    model += segments[6]?.selectedValue || "XXX";
    
    // Position 12: Controls (1 char)
    model += segments[7]?.selectedValue || "A";
    
    // Position 13: Refrigeration System (1 char)
    model += segments[8]?.selectedValue || "A";
    
    // Position 14: Heat Exchanger (1 char)
    model += segments[9]?.selectedValue || "X";
    
    // Position 15-24: Options Block (10 chars)
    for (let i = 10; i < 20; i++) {
      model += segments[i]?.selectedValue || "X";
    }
    
    return model;
  };
  
  // Convert nomenclature segments to BuildModelRequest format
  const convertSegmentsToBuildRequest = (segments: typeof nomenclatureSegments): BuildModelRequest | null => {
    if (!family || segments.length < 10) return null;
    
    try {
      // Extract values from all relevant segments
      const systemType = segments[2]?.selectedValue || "C";
      const capacityCode = segments[3]?.selectedValue || "036";
      const voltageCode = segments[4]?.selectedValue || "3";
      const fanDriveCode = segments[5]?.selectedValue || "D";
      const heatFieldCode = segments[6]?.selectedValue || "XXX";
      const controlsCode = segments[7]?.selectedValue || "A";
      const refrigSysCode = segments[8]?.selectedValue || "A";
      const heatExchangerCode = segments[9]?.selectedValue || "X";
      
      // Convert capacity code to tonnage
      const capacityMapping: Record<string, number> = {
        "036": 3.0, "048": 4.0, "060": 5.0, "072": 6.0,
        "090": 7.5, "102": 8.5, "120": 10.0, "150": 12.5,
        "180": 15.0, "240": 20.0, "300": 25.0
      };
      
      const tonnage = capacityMapping[capacityCode] || 3.0;
      
      // Build the basic request
      const buildRequest: BuildModelRequest = {
        family: family as DaikinFamilyKeys,
        tons: tonnage,
        voltage: voltageCode,
        fan_drive: fanDriveCode,
        controls: controlsCode,
        refrig_sys: refrigSysCode,
        heat_exchanger: heatExchangerCode,
        accessories: {} // Default empty accessories
      };
      
      // Add heat field based on system type
      if (systemType === "G") { // Gas/Electric
        if (heatFieldCode !== "XXX") {
          // Convert gas BTU code to numeric value
          const gasBtuMapping: Record<string, number> = {
            "045": 45000, "060": 60000, "070": 70000, "080": 80000,
            "090": 90000, "100": 100000, "115": 115000, "125": 125000,
            "130": 130000, "140": 140000, "150": 150000, "180": 180000,
            "210": 210000, "225": 225000, "240": 240000, "260": 260000,
            "350": 350000, "360": 360000, "400": 400000, "480": 480000
          };
          buildRequest.gas_btu_numeric = gasBtuMapping[heatFieldCode] || 100000;
        }
      } else if (systemType === "H") { // Heat Pump
        if (heatFieldCode !== "XXX") {
          // Convert electric kW code to numeric value
          const electricKwMapping: Record<string, number> = {
            "005": 5, "010": 10, "015": 15, "020": 20, "030": 30,
            "045": 45, "060": 60, "075": 75, "S05": 5, "S10": 10,
            "S15": 15, "S16": 15, "S18": 18, "S20": 20, "S21": 20,
            "S22": 20, "S25": 25, "S30": 30, "S31": 30, "S45": 45,
            "S46": 45, "S60": 60, "S75": 75
          };
          buildRequest.electric_kw = electricKwMapping[heatFieldCode] || 10;
        }
      }
      
      // Add accessories from positions 15-24 if any are selected
      const accessories: string[] = [];
      for (let i = 10; i < Math.min(20, segments.length); i++) {
        const accessoryCode = segments[i]?.selectedValue;
        if (accessoryCode && accessoryCode !== "X") {
          accessories.push(accessoryCode);
        }
      }
      
      if (accessories.length > 0) {
        // Convert accessories array to Record<string, string> format
        const accessoriesRecord: Record<string, string> = {};
        accessories.forEach((accessory, index) => {
          accessoriesRecord[`option_${index + 1}`] = accessory;
        });
        buildRequest.accessories = accessoriesRecord;
      }
      
      return buildRequest;
    } catch (error) {
      console.error("Error converting segments to build request:", error);
      return null;
    }
  };

  // Convert unit data to the format expected by EditableSpecificationForm
  const convertToSpecifications = () => {
    return [
      { label: "SEER2 Rating", value: normalizedUnit.seerRating.toString() },
      { label: "EER Rating", value: normalizedUnit.eerRating?.toString() || "N/A" },
      { label: "HSPF Rating", value: normalizedUnit.hspfRating?.toString() || "N/A" },
      { label: "Refrigerant", value: unit.refrigerant },
      { label: "Sound Level", value: unit.soundLevel.toString(), unit: "dB" },
      { label: "Operating Amperage", value: unit.operatingAmperage.toString(), unit: "A" },
      { label: "Max Fuse Size", value: unit.maxFuseSize.toString(), unit: "A" },
      { label: "Controls Type", value: unit.controlsType },
      { label: "Coil Type", value: unit.coilType },
    ];
  };

  // If editable and family is provided, and we're in edit mode, render the editable form
  if (isEditable && family && isEditMode) {
    return (
      <EditableSpecificationForm
        family={family}
        modelNumber={unit.modelNumber}
        systemType={unit.systemType}
        btuCapacity={unit.btuCapacity}
        voltage={unit.voltage}
        phases={unit.phases}
        specifications={convertToSpecifications()}
        isOriginal={false}
        onModelUpdate={handleSpecificationUpdate}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover-elevate'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              data-testid={`checkbox-select-unit-${unit.id}`}
              className="mt-1"
            />
            <div>
              <CardTitle className="text-primary text-lg flex items-center gap-2">
                Daikin {unit.modelNumber}
                <Badge className={efficiencyBadge.color} variant="secondary">
                  {efficiencyBadge.label}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={sizeMatchConfig[unit.sizeMatch].color} variant="secondary">
                  {sizeMatchConfig[unit.sizeMatch].label}
                </Badge>
                <Badge className={systemTypeColors[unit.systemType]} variant="secondary">
                  {unit.systemType}
                </Badge>
              </div>
            </div>
          </div>
          {isEditable && family && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleToggleEdit}
              data-testid="button-edit-enhanced-specifications"
              className="hover-elevate"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Core Specifications */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{unit.btuCapacity.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">BTU/hr</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Fan className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{unit.tonnage} Tons</p>
              <p className="text-xs text-muted-foreground">Capacity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{unit.voltage}V</p>
              <p className="text-xs text-muted-foreground">{unit.phases} Phase</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{normalizedUnit.seerRating} SEER</p>
              <p className="text-xs text-muted-foreground">Efficiency</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewDetails(unit)}
            data-testid={`button-view-details-${unit.id}`}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Details
          </Button>
          {onAddToProject && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onAddToProject(unit)}
              data-testid={`button-add-project-${unit.id}`}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add to Project
            </Button>
          )}
          {onGenerateQuote && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onGenerateQuote(unit)}
              data-testid={`button-generate-quote-${unit.id}`}
            >
              <FileText className="h-3 w-3 mr-1" />
              Quote
            </Button>
          )}
        </div>

        {/* Collapsible Detailed Specifications */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center justify-between w-full p-0 h-auto"
              data-testid={`button-expand-specs-${unit.id}`}
            >
              <span className="text-sm font-medium">Detailed Specifications</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4">
            <Separator />
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="nomenclature" data-testid="tab-nomenclature">Model Builder</TabsTrigger>
                <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
                <TabsTrigger value="technical" data-testid="tab-technical">Technical</TabsTrigger>
              </TabsList>
              
              <TabsContent value="nomenclature" className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Code2 className="h-4 w-4" />
                    Model Number Builder
                  </h4>
                  
                  {/* Dynamic Model Number Display */}
                  <div className="bg-muted/50 p-3 rounded-md mb-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Current Model Number</p>
                      <div className="flex items-center justify-center gap-2">
                        {modelBuilder.isBuilding && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" data-testid="loader-model-building" />
                        )}
                        <p className="text-lg font-mono font-bold text-primary" data-testid="text-dynamic-model-number">
                          {dynamicModelNumber}
                        </p>
                      </div>
                      {modelBuildError && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <AlertCircle className="h-3 w-3 text-orange-500" />
                          <p className="text-xs text-orange-600" data-testid="text-model-build-error">
                            {modelBuildError}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Interactive Nomenclature Segments */}
                  <div className="space-y-4">
                    {nomenclatureSegments.map((segment, index) => (
                      <div key={segment.position} className="border rounded-md p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {segment.position}
                              </Badge>
                              <span className="text-sm font-medium">{segment.description}</span>
                            </div>
                            <Select 
                              value={segment.selectedValue} 
                              onValueChange={(value) => handleSegmentChange(index, value)}
                              data-testid={`select-segment-${index}`}
                              disabled={modelBuilder.isBuilding}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {segment.options.map((option) => (
                                  <SelectItem 
                                    key={option.value} 
                                    value={option.value}
                                    data-testid={`option-${segment.position.toLowerCase().replace(/\s+/g, '-')}-${option.value}`}
                                  >
                                    <div>
                                      <span className="font-medium">{option.value}</span>
                                      <span className="text-muted-foreground ml-2">- {option.description}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-mono font-bold text-primary">
                              {segment.selectedValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Model Building Status */}
                  {(modelBuilder.isBuilding || modelBuildError) && (
                    <div className="mt-4 p-2 rounded-md border">
                      {modelBuilder.isBuilding && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Building model number...</span>
                        </div>
                      )}
                      {modelBuildError && !modelBuilder.isBuilding && (
                        <div className="flex items-center gap-2 text-sm text-orange-600">
                          <AlertCircle className="h-3 w-3" />
                          <span>{modelBuildError}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Model Building Actions */}
                  {isEditable && (
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (onSpecificationUpdate) {
                            onSpecificationUpdate(dynamicModelNumber, convertToSpecifications());
                          }
                        }}
                        data-testid="button-apply-model-changes"
                        disabled={modelBuilder.isBuilding}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Apply Changes
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setNomenclatureSegments(getNomenclatureBreakdown(unit.modelNumber));
                          setDynamicModelNumber(unit.modelNumber);
                          setModelBuildError(null);
                        }}
                        data-testid="button-reset-model"
                        disabled={modelBuilder.isBuilding}
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="performance" className="space-y-6" data-testid="tabcontent-performance">
                {/* Comprehensive Performance Ratings */}
                <div className="space-y-4" data-testid="section-performance-ratings">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Performance Ratings
                  </h4>
                  
                  {/* Standard Efficiency Ratings */}
                  <div className="border rounded-lg p-4" data-testid="subsection-standard-ratings">
                    <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Standard Ratings</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-muted/30 p-3 rounded-md" data-testid="rating-seer">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">SEER:</span>
                          <span className="font-bold text-lg" data-testid="value-seer">{normalizedUnit.seerRating}</span>
                        </div>
                      </div>
                      {unit.performanceRatings?.seer2Rating && (
                        <div className="bg-muted/30 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">SEER2:</span>
                            <span className="font-bold text-lg">{unit.performanceRatings.seer2Rating}</span>
                          </div>
                        </div>
                      )}
                      {unit.performanceRatings?.eerRating && (
                        <div className="bg-muted/30 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">EER:</span>
                            <span className="font-bold text-lg">{unit.performanceRatings.eerRating}</span>
                          </div>
                        </div>
                      )}
                      {unit.performanceRatings?.eer2Rating && (
                        <div className="bg-muted/30 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">EER2:</span>
                            <span className="font-bold text-lg">{unit.performanceRatings.eer2Rating}</span>
                          </div>
                        </div>
                      )}
                      {unit.performanceRatings?.hspfRating && (
                        <div className="bg-muted/30 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">HSPF:</span>
                            <span className="font-bold text-lg">{unit.performanceRatings.hspfRating}</span>
                          </div>
                        </div>
                      )}
                      {unit.performanceRatings?.hspf2Rating && (
                        <div className="bg-muted/30 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">HSPF2:</span>
                            <span className="font-bold text-lg">{unit.performanceRatings.hspf2Rating}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Commercial Performance Ratings */}
                  {(unit.performanceRatings?.ieerRating || unit.performanceRatings?.iplvRating || unit.performanceRatings?.copRating) && (
                    <div className="border rounded-lg p-4" data-testid="subsection-commercial-performance">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Commercial Performance</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {unit.performanceRatings.ieerRating && (
                          <div className="bg-muted/30 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">IEER:</span>
                              <span className="font-bold text-lg">{unit.performanceRatings.ieerRating}</span>
                            </div>
                          </div>
                        )}
                        {unit.performanceRatings.iplvRating && (
                          <div className="bg-muted/30 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">IPLV:</span>
                              <span className="font-bold text-lg">{unit.performanceRatings.iplvRating}</span>
                            </div>
                          </div>
                        )}
                        {unit.performanceRatings.copRating && (
                          <div className="bg-muted/30 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">COP:</span>
                              <span className="font-bold text-lg">{unit.performanceRatings.copRating}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Part Load Performance */}
                  {unit.performanceRatings?.partLoadEfficiency && (
                    <div className="border rounded-lg p-4" data-testid="subsection-part-load-efficiency">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Part Load Efficiency</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs mb-1">25% Load</div>
                          <div className="font-semibold">{unit.performanceRatings.partLoadEfficiency.at25Percent}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs mb-1">50% Load</div>
                          <div className="font-semibold">{unit.performanceRatings.partLoadEfficiency.at50Percent}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs mb-1">75% Load</div>
                          <div className="font-semibold">{unit.performanceRatings.partLoadEfficiency.at75Percent}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs mb-1">100% Load</div>
                          <div className="font-semibold">{unit.performanceRatings.partLoadEfficiency.at100Percent}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Heat Pump Capacity Retention */}
                  {unit.performanceRatings?.capacityRetention && (
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Heating Capacity Retention</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-muted/30 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">At 5°F:</span>
                            <span className="font-semibold">{unit.performanceRatings.capacityRetention.at5F}%</span>
                          </div>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">At 17°F:</span>
                            <span className="font-semibold">{unit.performanceRatings.capacityRetention.at17F}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="technical" className="space-y-6" data-testid="tabcontent-technical">
                {/* Physical Specifications */}
                <div className="space-y-4" data-testid="section-physical-specifications">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Physical Specifications
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dimensions & Weight */}
                    <div className="border rounded-lg p-4" data-testid="subsection-dimensions-weight">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Dimensions & Weight</h5>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dimensions (L×W×H):</span>
                          <span className="font-medium">
                            {unit.physicalSpecs?.dimensions?.length || unit.dimensions.length}" × 
                            {unit.physicalSpecs?.dimensions?.width || unit.dimensions.width}" × 
                            {unit.physicalSpecs?.dimensions?.height || unit.dimensions.height}"
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Operating Weight:</span>
                          <span className="font-medium">{unit.physicalSpecs?.weight?.operating || unit.weight} lbs</span>
                        </div>
                        {unit.physicalSpecs?.weight?.shipping && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Shipping Weight:</span>
                            <span className="font-medium">{unit.physicalSpecs.weight.shipping} lbs</span>
                          </div>
                        )}
                        {unit.physicalSpecs?.footprint && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Footprint:</span>
                            <span className="font-medium">{unit.physicalSpecs.footprint.area} sq ft</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clearances & Service */}
                    {unit.physicalSpecs?.clearances && (
                      <div className="border rounded-lg p-4">
                        <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Clearances & Service</h5>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sides:</span>
                            <span className="font-medium">{unit.physicalSpecs.clearances.sides}"</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Back:</span>
                            <span className="font-medium">{unit.physicalSpecs.clearances.back}"</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Front:</span>
                            <span className="font-medium">{unit.physicalSpecs.clearances.front}"</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Top:</span>
                            <span className="font-medium">{unit.physicalSpecs.clearances.top}"</span>
                          </div>
                          {unit.physicalSpecs.serviceAccess && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Control Access:</span>
                              <span className="font-medium">{unit.physicalSpecs.serviceAccess.controlPanel}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Electrical Specifications */}
                <div className="space-y-4" data-testid="section-electrical-specifications">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Electrical Specifications
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Operating Characteristics */}
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Operating Characteristics</h5>
                      <div className="space-y-3 text-sm">
                        {unit.electricalSpecs?.operatingAmperage?.cooling && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">RLA (Cooling):</span>
                              <span className="font-medium">{unit.electricalSpecs.operatingAmperage.cooling.rla}A</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">MCA (Cooling):</span>
                              <span className="font-medium">{unit.electricalSpecs.operatingAmperage.cooling.mca}A</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">LRA (Cooling):</span>
                              <span className="font-medium">{unit.electricalSpecs.operatingAmperage.cooling.lra}A</span>
                            </div>
                          </>
                        )}
                        {unit.electricalSpecs?.operatingAmperage?.heating && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">RLA (Heating):</span>
                              <span className="font-medium">{unit.electricalSpecs.operatingAmperage.heating.rla}A</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">MCA (Heating):</span>
                              <span className="font-medium">{unit.electricalSpecs.operatingAmperage.heating.mca}A</span>
                            </div>
                          </>
                        )}
                        {unit.electricalSpecs?.operatingAmperage?.fan && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fan FLA:</span>
                            <span className="font-medium">{unit.electricalSpecs.operatingAmperage.fan.fla}A</span>
                          </div>
                        )}
                        {!unit.electricalSpecs?.operatingAmperage && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Operating Amps:</span>
                            <span className="font-medium">{unit.operatingAmperage}A</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Protection & Wiring */}
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Protection & Wiring</h5>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Max Fuse Size:</span>
                          <span className="font-medium">{unit.electricalSpecs?.protection?.maxFuseSize || unit.maxFuseSize}A</span>
                        </div>
                        {unit.electricalSpecs?.protection?.maxBreaker && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Breaker:</span>
                            <span className="font-medium">{unit.electricalSpecs.protection.maxBreaker}A</span>
                          </div>
                        )}
                        {unit.electricalSpecs?.protection?.minimumWireSize && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Min Wire Size:</span>
                            <span className="font-medium">{unit.electricalSpecs.protection.minimumWireSize}</span>
                          </div>
                        )}
                        {unit.electricalSpecs?.protection?.groundWireSize && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ground Wire:</span>
                            <span className="font-medium">{unit.electricalSpecs.protection.groundWireSize}</span>
                          </div>
                        )}
                        {unit.electricalSpecs?.disconnect && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Disconnect:</span>
                            <span className="font-medium">{unit.electricalSpecs.disconnect.ampRating}A {unit.electricalSpecs.disconnect.type}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Power Consumption */}
                  {unit.electricalSpecs?.powerConsumption && (
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Power Consumption</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs mb-1">Cooling Full Load</div>
                          <div className="font-semibold">{unit.electricalSpecs.powerConsumption.cooling.fullLoad} kW</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs mb-1">Cooling Part Load</div>
                          <div className="font-semibold">{unit.electricalSpecs.powerConsumption.cooling.partLoad} kW</div>
                        </div>
                        {unit.electricalSpecs.powerConsumption.heating && (
                          <>
                            <div className="text-center">
                              <div className="text-muted-foreground text-xs mb-1">Heating Full Load</div>
                              <div className="font-semibold">{unit.electricalSpecs.powerConsumption.heating.fullLoad} kW</div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground text-xs mb-1">Heating Part Load</div>
                              <div className="font-semibold">{unit.electricalSpecs.powerConsumption.heating.partLoad} kW</div>
                            </div>
                          </>
                        )}
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs mb-1">Standby</div>
                          <div className="font-semibold">{unit.electricalSpecs.powerConsumption.standby} W</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Airflow Specifications */}
                <div className="space-y-4" data-testid="section-airflow-specifications">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Wind className="h-4 w-4" />
                    Airflow & Fan Performance
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Airflow Data */}
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Airflow Data</h5>
                      <div className="space-y-3 text-sm">
                        {unit.airflowSpecs?.coolingAirflow && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nominal CFM:</span>
                              <span className="font-medium">{unit.airflowSpecs.coolingAirflow.nominalCfm.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">CFM per Ton:</span>
                              <span className="font-medium">{unit.airflowSpecs.coolingAirflow.cfmPerTon}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Std ESP:</span>
                              <span className="font-medium">{unit.airflowSpecs.coolingAirflow.externalStaticPressure.standard}" w.c.</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Max ESP:</span>
                              <span className="font-medium">{unit.airflowSpecs.coolingAirflow.externalStaticPressure.maximum}" w.c.</span>
                            </div>
                          </>
                        )}
                        {unit.airflowSpecs?.heatingAirflow && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Heating CFM:</span>
                              <span className="font-medium">{unit.airflowSpecs.heatingAirflow.nominalCfm.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Temp Rise:</span>
                              <span className="font-medium">{unit.airflowSpecs.heatingAirflow.temperatureRise.minimum}-{unit.airflowSpecs.heatingAirflow.temperatureRise.maximum}°F</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Fan Specifications */}
                    {unit.airflowSpecs?.fanSpecs && (
                      <div className="border rounded-lg p-4">
                        <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Fan Specifications</h5>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fan Type:</span>
                            <span className="font-medium">{unit.airflowSpecs.fanSpecs.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Motor HP:</span>
                            <span className="font-medium">{unit.airflowSpecs.fanSpecs.motorHp} HP</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">High Speed:</span>
                            <span className="font-medium">{unit.airflowSpecs.fanSpecs.speed.high} RPM</span>
                          </div>
                          {unit.airflowSpecs.fanSpecs.speed.medium && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Medium Speed:</span>
                              <span className="font-medium">{unit.airflowSpecs.fanSpecs.speed.medium} RPM</span>
                            </div>
                          )}
                          {unit.airflowSpecs.fanSpecs.speed.low && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Low Speed:</span>
                              <span className="font-medium">{unit.airflowSpecs.fanSpecs.speed.low} RPM</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bearing Type:</span>
                            <span className="font-medium">{unit.airflowSpecs.fanSpecs.bearingType}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sound Specifications */}
                <div className="space-y-4" data-testid="section-sound-specifications">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <MonitorSpeaker className="h-4 w-4" />
                    Sound Data
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Overall Sound Levels */}
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Overall Sound Levels</h5>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sound Level:</span>
                          <span className="font-medium">{unit.soundLevel} dB(A)</span>
                        </div>
                        {unit.soundSpecs?.soundPower && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sound Power (Cooling):</span>
                              <span className="font-medium">{unit.soundSpecs.soundPower.cooling} dB(A)</span>
                            </div>
                            {unit.soundSpecs.soundPower.heating && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Sound Power (Heating):</span>
                                <span className="font-medium">{unit.soundSpecs.soundPower.heating} dB(A)</span>
                              </div>
                            )}
                          </>
                        )}
                        {unit.soundSpecs?.soundPressure && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sound Pressure (Cooling):</span>
                              <span className="font-medium">{unit.soundSpecs.soundPressure.cooling} dB(A) @ 10ft</span>
                            </div>
                            {unit.soundSpecs.soundPressure.heating && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Sound Pressure (Heating):</span>
                                <span className="font-medium">{unit.soundSpecs.soundPressure.heating} dB(A) @ 10ft</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Octave Band Analysis */}
                    {unit.soundSpecs?.octaveBands && (
                      <div className="border rounded-lg p-4">
                        <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Octave Band Analysis (Cooling)</h5>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">63 Hz</div>
                            <div className="font-semibold">{unit.soundSpecs.octaveBands.cooling.hz63}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">125 Hz</div>
                            <div className="font-semibold">{unit.soundSpecs.octaveBands.cooling.hz125}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">250 Hz</div>
                            <div className="font-semibold">{unit.soundSpecs.octaveBands.cooling.hz250}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">500 Hz</div>
                            <div className="font-semibold">{unit.soundSpecs.octaveBands.cooling.hz500}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">1K Hz</div>
                            <div className="font-semibold">{unit.soundSpecs.octaveBands.cooling.hz1000}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">2K Hz</div>
                            <div className="font-semibold">{unit.soundSpecs.octaveBands.cooling.hz2000}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">4K Hz</div>
                            <div className="font-semibold">{unit.soundSpecs.octaveBands.cooling.hz4000}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">8K Hz</div>
                            <div className="font-semibold">{unit.soundSpecs.octaveBands.cooling.hz8000}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Refrigerant Specifications */}
                <div className="space-y-4" data-testid="section-refrigerant-specifications">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    Refrigerant System
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Refrigerant & Charge */}
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Refrigerant & Charge</h5>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Refrigerant Type:</span>
                          <span className="font-medium">{unit.refrigerantSpecs?.type || unit.refrigerant}</span>
                        </div>
                        {unit.refrigerantSpecs?.charge && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Factory Charge:</span>
                              <span className="font-medium">{unit.refrigerantSpecs.charge.factory} lbs</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Field Charge:</span>
                              <span className="font-medium">{unit.refrigerantSpecs.charge.field} lbs</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Charge:</span>
                              <span className="font-medium">{unit.refrigerantSpecs.charge.total} lbs</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Connection Sizes */}
                    {unit.refrigerantSpecs?.connections && (
                      <div className="border rounded-lg p-4">
                        <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Connection Sizes</h5>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Liquid Line:</span>
                            <span className="font-medium">{unit.refrigerantSpecs.connections.liquid.size} {unit.refrigerantSpecs.connections.liquid.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Suction Line:</span>
                            <span className="font-medium">{unit.refrigerantSpecs.connections.suction.size} {unit.refrigerantSpecs.connections.suction.type}</span>
                          </div>
                          {unit.refrigerantSpecs.connections.hotGas && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Hot Gas:</span>
                              <span className="font-medium">{unit.refrigerantSpecs.connections.hotGas.size} {unit.refrigerantSpecs.connections.hotGas.type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Operating Pressures */}
                  {unit.refrigerantSpecs?.operatingPressures && (
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Operating Pressures</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs mb-1">Low Side (Cooling)</div>
                          <div className="font-semibold">{unit.refrigerantSpecs.operatingPressures.cooling.lowSide.min}-{unit.refrigerantSpecs.operatingPressures.cooling.lowSide.max} psig</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs mb-1">High Side (Cooling)</div>
                          <div className="font-semibold">{unit.refrigerantSpecs.operatingPressures.cooling.highSide.min}-{unit.refrigerantSpecs.operatingPressures.cooling.highSide.max} psig</div>
                        </div>
                        {unit.refrigerantSpecs.operatingPressures.heating && (
                          <>
                            <div className="text-center">
                              <div className="text-muted-foreground text-xs mb-1">Low Side (Heating)</div>
                              <div className="font-semibold">{unit.refrigerantSpecs.operatingPressures.heating.lowSide.min}-{unit.refrigerantSpecs.operatingPressures.heating.lowSide.max} psig</div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground text-xs mb-1">High Side (Heating)</div>
                              <div className="font-semibold">{unit.refrigerantSpecs.operatingPressures.heating.highSide.min}-{unit.refrigerantSpecs.operatingPressures.heating.highSide.max} psig</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* System Components */}
                  {unit.refrigerantSpecs?.systemComponents && (
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">System Components</h5>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expansion Device:</span>
                          <span className="font-medium">{unit.refrigerantSpecs.systemComponents.expansionDevice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Filter Drier:</span>
                          <span className="font-medium">{unit.refrigerantSpecs.systemComponents.filterDrier}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sight Glass:</span>
                          <span className="font-medium">{unit.refrigerantSpecs.systemComponents.sightGlass ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Service Valves:</span>
                          <span className="font-medium">{unit.refrigerantSpecs.systemComponents.serviceValves ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* System Features */}
                <div className="space-y-4" data-testid="section-system-features">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Cog className="h-4 w-4" />
                    System Features & Controls
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Capacity Control */}
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Capacity Control</h5>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cooling Stages:</span>
                          <span className="font-medium">{unit.systemFeatures?.capacity?.coolingStages || unit.coolingStages}</span>
                        </div>
                        {(unit.systemFeatures?.capacity?.heatingStages || unit.heatingStages) && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Heating Stages:</span>
                            <span className="font-medium">{unit.systemFeatures?.capacity?.heatingStages || unit.heatingStages}</span>
                          </div>
                        )}
                        {unit.systemFeatures?.capacity?.modulation && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Variable Capacity:</span>
                            <span className="font-medium">Yes</span>
                          </div>
                        )}
                        {unit.systemFeatures?.capacity?.turndownRatio && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Turndown Ratio:</span>
                            <span className="font-medium">{unit.systemFeatures.capacity.turndownRatio}:1</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Drive Type:</span>
                          <span className="font-medium">{unit.driveType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Control Systems */}
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Control Systems</h5>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Controls Type:</span>
                          <span className="font-medium">{unit.systemFeatures?.controls?.type || unit.controlsType}</span>
                        </div>
                        {unit.systemFeatures?.controls?.interface && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Interface:</span>
                            <span className="font-medium">{unit.systemFeatures.controls.interface}</span>
                          </div>
                        )}
                        {unit.systemFeatures?.controls?.communicationProtocols && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Communication:</span>
                            <span className="font-medium">{unit.systemFeatures.controls.communicationProtocols.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* IAQ Features */}
                  {unit.systemFeatures?.iaqFeatures && (
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Indoor Air Quality Features</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-muted-foreground">Standard Filtration:</span>
                            <span className="font-medium">{unit.systemFeatures.iaqFeatures.filtration.standard}</span>
                          </div>
                          {unit.systemFeatures.iaqFeatures.filtration.optional.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Optional Filters:</span>
                              <span className="font-medium">{unit.systemFeatures.iaqFeatures.filtration.optional.join(', ')}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-muted-foreground">Economizer:</span>
                            <span className="font-medium">{unit.systemFeatures.iaqFeatures.ventilation.economizer ? 'Available' : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between mb-2">
                            <span className="text-muted-foreground">Fresh Air Intake:</span>
                            <span className="font-medium">{unit.systemFeatures.iaqFeatures.ventilation.freshAirIntake ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ERV:</span>
                            <span className="font-medium">{unit.systemFeatures.iaqFeatures.ventilation.erv ? 'Available' : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Operating Conditions */}
                  <div className="border rounded-lg p-4">
                    <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Operating Conditions</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cooling Range:</span>
                          <span className="font-medium">
                            {unit.operatingConditions?.temperatureRange?.cooling?.min || unit.temperatureRange.cooling.min}°F to 
                            {unit.operatingConditions?.temperatureRange?.cooling?.max || unit.temperatureRange.cooling.max}°F
                          </span>
                        </div>
                        {(unit.operatingConditions?.temperatureRange?.heating || unit.temperatureRange.heating) && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Heating Range:</span>
                            <span className="font-medium">
                              {unit.operatingConditions?.temperatureRange?.heating?.min || unit.temperatureRange.heating?.min}°F to 
                              {unit.operatingConditions?.temperatureRange?.heating?.max || unit.temperatureRange.heating?.max}°F
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Coil Type:</span>
                          <span className="font-medium">{unit.coilType}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {unit.operatingConditions?.altitudeLimit && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Altitude:</span>
                            <span className="font-medium">{unit.operatingConditions.altitudeLimit.toLocaleString()} ft</span>
                          </div>
                        )}
                        {unit.operatingConditions?.humidityRange && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Humidity Range:</span>
                            <span className="font-medium">{unit.operatingConditions.humidityRange.min}-{unit.operatingConditions.humidityRange.max}% RH</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}