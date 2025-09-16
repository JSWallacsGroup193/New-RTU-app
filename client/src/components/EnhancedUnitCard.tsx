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
  Info,
  CheckCircle2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRealTimeModelBuilder } from "@/hooks/useModelBuilder";
import type { BuildModelRequest, DaikinFamilyKeys, EnhancedUnit } from "@shared/schema";

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
  // Compact variant for comparison layout
  variant?: "default" | "compact";
  // Sizing comparison specific props
  sizingConfig?: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    borderColor: string;
    badgeClass: string;
    description: string;
  };
  compactClassName?: string;
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
  onFieldAccessoriesChange,
  variant = "default",
  sizingConfig,
  compactClassName
}: EnhancedUnitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("performance");
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Enhanced nomenclature builder state with proper initialization
  const [nomenclatureSegments, setNomenclatureSegments] = useState<Array<{
    position: string;
    code: string;
    description: string;
    options: Array<{ value: string; description: string; }>;
    selectedValue: string;
    isValid?: boolean;
    validationMessage?: string;
  }>>([]);

  // Initialize nomenclature segments when unit data is available
  useEffect(() => {
    if (family && unit.modelNumber) {
      try {
        const segments = getNomenclatureBreakdown(unit.modelNumber);
        setNomenclatureSegments(segments);
      } catch (error) {
        console.warn('Failed to initialize nomenclature segments:', error);
        setNomenclatureSegments([]);
      }
    } else {
      setNomenclatureSegments([]);
    }
  }, [family, unit.modelNumber]);
  const [dynamicModelNumber, setDynamicModelNumber] = useState(unit.modelNumber ?? "");
  const [modelBuildError, setModelBuildError] = useState<string | null>(null);
  const [modelBuildSuccess, setModelBuildSuccess] = useState<boolean>(false);
  const [lastValidModel, setLastValidModel] = useState<string | null>(null);
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
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
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

  const getCompatibilityScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (score >= 80) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (score >= 70) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    if (score >= 60) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  const normalizedUnit = normalizeUnit(unit);
  const efficiencyBadge = getEfficiencyBadge(normalizedUnit.modelNumber);

  // Group factory options by category
  const factoryOptionsByCategory = (unit.factoryOptions || []).reduce((acc, option) => {
    if (!acc[option.category]) acc[option.category] = [];
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, FactoryOption[]>);

  // Group field accessories by category
  const fieldAccessoriesByCategory = (unit.fieldAccessories || []).reduce((acc, accessory) => {
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
  // Guard against re-initialization while editing
  useEffect(() => {
    if (!isEditMode && unit.modelNumber && family) {
      const segments = getNomenclatureBreakdown(unit.modelNumber);
      setNomenclatureSegments(segments);
      setDynamicModelNumber(unit.modelNumber);
    }
  }, [unit.modelNumber, family, isEditMode]);

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
  // New proper updateSegmentValue function that prevents state reset
  const updateSegmentValue = (position: string, value: string) => {
    setNomenclatureSegments(prev => prev.map(segment => 
      segment.position === position 
        ? { 
            ...segment, 
            selectedValue: value, 
            code: value,
            isValid: true, 
            validationMessage: undefined 
          }
        : segment
    ));
    
    // Build new model from updated segments
    const updatedSegments = nomenclatureSegments.map(segment => 
      segment.position === position 
        ? { ...segment, selectedValue: value, code: value }
        : segment
    );
    
    const nextModel = buildModelFromSegments(updatedSegments);
    setDynamicModelNumber(nextModel);
    
    // Convert to build request
    const buildRequest = convertSegmentsToBuildRequest(updatedSegments);
    
    if (buildRequest) {
      setModelBuildError(null);
      
      // Clear any existing cleanup function
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      
      // Use model builder but don't reset segments on error
      cleanupRef.current = modelBuilder.buildModel(buildRequest, (response) => {
        if (response && response.success && response.result) {
          const newModelNumber = response.result.model;
          setDynamicModelNumber(newModelNumber);
          setLastValidModel(newModelNumber);
          setModelBuildSuccess(true);
          setModelBuildError(null);
          
          // Validate segments but don't reset them
          setNomenclatureSegments(prev => prev.map(segment => ({
            ...segment,
            isValid: true,
            validationMessage: undefined
          })));
          
          // Trigger specification update callback if provided
          if (onSpecificationUpdate) {
            onSpecificationUpdate(newModelNumber, response.result.specifications);
          }
        } else {
          setModelBuildSuccess(false);
          // Keep the manual model but don't reset segments
          const errorMessage = response?.errors?.[0] || "Model configuration may be invalid";
          setModelBuildError(`${errorMessage}. Using fallback model: ${nextModel}`);
          
          // Mark invalid but don't reset segment values
          setNomenclatureSegments(prev => prev.map(segment => 
            segment.position === position 
              ? { ...segment, isValid: false, validationMessage: errorMessage }
              : segment
          ));
        }
      });
    }
  };

  // Helper function to build model from segments
  const buildModelFromSegments = (segments: typeof nomenclatureSegments): string => {
    return segments.map(segment => segment.selectedValue || segment.code || 'X').join('');
  };

  // Keep original handleSegmentChange for backward compatibility but mark as deprecated
  const handleSegmentChange = (segmentIndex: number, newValue: string) => {
    const segment = nomenclatureSegments[segmentIndex];
    if (segment) {
      updateSegmentValue(segment.position, newValue);
    }
  };

  // Enhanced validation for nomenclature segments
  const validateNomenclatureSegments = (segments: typeof nomenclatureSegments, buildResult?: any) => {
    return segments.map((segment, index) => {
      let isValid = true;
      let validationMessage = "";

      // Validate based on position and dependencies
      switch (index) {
        case 2: // System Type
          isValid = ["C", "G", "H"].includes(segment.selectedValue);
          if (!isValid) validationMessage = "Invalid system type selected";
          break;
        case 3: // Capacity
          isValid = /^\d{3}$/.test(segment.selectedValue);
          if (!isValid) validationMessage = "Capacity must be 3 digits";
          break;
        case 4: // Voltage
          isValid = ["1", "3", "4", "7"].includes(segment.selectedValue);
          if (!isValid) validationMessage = "Invalid voltage/phase code";
          break;
        case 6: // Heat Field - validate based on system type
          const systemType = segments[2]?.selectedValue;
          if (systemType === "G" && segment.selectedValue === "XXX") {
            isValid = false;
            validationMessage = "Gas/Electric systems require heat specification";
          } else if (systemType === "C" && segment.selectedValue !== "XXX") {
            isValid = false;
            validationMessage = "Straight A/C systems should not have heat";
          }
          break;
        default:
          isValid = segment.selectedValue !== "";
      }

      return {
        ...segment,
        isValid,
        validationMessage: isValid ? "" : validationMessage
      };
    });
  };

  // Mark segments with validation errors
  const markInvalidSegments = (segments: typeof nomenclatureSegments, errors?: string[]) => {
    return segments.map((segment, index) => {
      // Basic validation for common issues
      let isValid = true;
      let validationMessage = "";

      if (!segment.selectedValue || segment.selectedValue === "") {
        isValid = false;
        validationMessage = "Value required";
      }

      return {
        ...segment,
        isValid,
        validationMessage
      };
    });
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

  // Compact variant for comparison layout
  if (variant === "compact" && sizingConfig) {
    const isDirect = unit.sizeMatch === "direct";
    const formatTonnage = (btuCapacity: number) => {
      const tonnage = btuCapacity / 12000;
      return tonnage % 1 === 0 ? `${tonnage}.0` : tonnage.toFixed(1);
    };

    return (
      <Card 
        className={`relative transition-all duration-200 cursor-pointer hover-elevate ${
          isSelected ? `ring-2 ${sizingConfig.borderColor}` : ''
        } ${isDirect ? 'lg:scale-105 lg:shadow-lg' : ''} ${compactClassName || ''}`}
        onClick={() => onSelectionChange(!isSelected)}
        data-testid={`card-unit-${unit.sizeMatch}`}
      >
        {/* Sizing Badge Header */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`${sizingConfig.color} text-white p-2 rounded-lg`}>
                {sizingConfig.icon}
              </div>
              <div>
                <Badge className={sizingConfig.badgeClass} data-testid={`badge-${unit.sizeMatch}`}>
                  {sizingConfig.title}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {sizingConfig.subtitle}
                </p>
              </div>
            </div>
            {isDirect && (
              <CheckCircle2 className="w-5 h-5 text-green-500" data-testid="icon-recommended" />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Model Number */}
          <div className="text-center">
            <h4 className="font-semibold text-sm font-mono text-foreground" data-testid={`text-model-${unit.sizeMatch}`}>
              {unit.modelNumber}
            </h4>
            {isEditable && family && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleEdit();
                }}
                data-testid="button-edit-enhanced-specifications"
                className="mt-1 text-xs hover-elevate"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit Model
              </Button>
            )}
          </div>

          {/* Prominent Capacity Display */}
          <div className="text-center bg-muted rounded-lg p-4">
            {unit.systemType === "Gas/Electric" && typeof unit.heatingBTU === 'number' ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Thermometer className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">HEATING CAPACITY</span>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-foreground" data-testid={`text-heating-capacity-${unit.sizeMatch}`}>
                    {Number(unit.heatingBTU).toLocaleString()} BTU/h
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Gas Heating Capacity
                  </div>
                  <div className="text-xs text-muted-foreground pt-1">
                    {formatTonnage(unit.btuCapacity)} Tons Cooling ({Number(unit.btuCapacity).toLocaleString()} BTU/h)
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Thermometer className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">CAPACITY</span>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-foreground" data-testid={`text-capacity-${unit.sizeMatch}`}>
                    {formatTonnage(unit.btuCapacity)} Tons
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Number(unit.btuCapacity).toLocaleString()} BTU/h Cooling
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Key Specifications */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">SEER:</span>
                <span className="font-medium" data-testid={`text-seer-${unit.sizeMatch}`}>
                  {normalizedUnit.seerRating}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Sound:</span>
                <span className="font-medium" data-testid={`text-sound-${unit.sizeMatch}`}>
                  {unit.soundLevel} dB
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Ruler className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Voltage:</span>
                <span className="font-medium text-xs">
                  {unit.voltage}V/{unit.phases}φ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Weight className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Weight:</span>
                <span className="font-medium">
                  {unit.weight} lbs
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* System Type & Drive */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">System:</span>
              <span className="font-medium">{unit.systemType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Drive:</span>
              <span className="font-medium">{unit.driveType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Refrigerant:</span>
              <span className="font-medium">{unit.refrigerant}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button 
              variant={isDirect ? "default" : "outline"}
              className="w-full text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(unit);
              }}
              data-testid={`button-details-${unit.sizeMatch}`}
            >
              View Details
            </Button>
            
            {onAddToProject && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToProject(unit);
                }}
                data-testid={`button-add-${unit.sizeMatch}`}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add to Project
              </Button>
            )}
          </div>

          {/* Sizing Explanation */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground italic">
              {sizingConfig.description}
            </p>
          </div>

          {/* Collapsible Nomenclature Section for Compact */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center justify-between w-full p-0 h-auto"
                data-testid={`button-expand-specs-${unit.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-sm font-medium">Model Builder & Specs</span>
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
                
                {/* Include the full tab content from the original component */}
                <TabsContent value="nomenclature" className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Code2 className="h-4 w-4" />
                      Model Number Builder
                    </h4>
                    
                    {/* Dynamic Model Number Display */}
                    <div className={`p-4 rounded-lg mb-4 border transition-all duration-300 ${
                      modelBuildSuccess 
                        ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                        : modelBuildError 
                          ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800" 
                          : "bg-muted border-muted-foreground/20"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Dynamic Model:</span>
                        {modelBuilder.isBuilding && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-lg font-mono font-bold text-foreground mb-2">
                        {dynamicModelNumber || "Building..."}
                      </div>
                      {modelBuildError && (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{modelBuildError}</span>
                        </div>
                      )}
                    </div>

                    {/* Nomenclature segments grid - truncated for space */}
                    {family && nomenclatureSegments.length > 0 && (
                      <div className="grid grid-cols-1 gap-2">
                        <p className="text-xs text-muted-foreground">24-Position Model Builder (First 6 positions shown)</p>
                        {nomenclatureSegments.slice(0, 6).map((segment, index) => (
                          <div key={`${segment.position}-${index}`} className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                            <span className="font-mono w-8">{segment.position}</span>
                            <span className="w-12 font-bold">{segment.code}</span>
                            <span className="flex-1 truncate">{segment.description}</span>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground italic">Expand for full 24-position editor</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
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
                {unit.compatibilityScore !== undefined && (
                  <Badge 
                    className={getCompatibilityScoreColor(unit.compatibilityScore)} 
                    variant="secondary"
                    data-testid={`badge-compatibility-score-${unit.id}`}
                  >
                    {unit.compatibilityScore}% Match
                  </Badge>
                )}
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
              {unit.systemType === "Gas/Electric" && typeof unit.heatingBTU === 'number' ? (
                <>
                  <p className="text-sm font-medium">
                    {Number(unit.btuCapacity).toLocaleString()} Cooling
                  </p>
                  <p className="text-sm font-medium">
                    {Number(unit.heatingBTU).toLocaleString()} Heating
                  </p>
                  <p className="text-xs text-muted-foreground">BTU/hr</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    {Number(unit.btuCapacity).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Cooling BTU/hr</p>
                </>
              )}
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
                  
                  {/* Enhanced Dynamic Model Number Display */}
                  <div className={`p-4 rounded-lg mb-4 border transition-all duration-300 ${
                    modelBuildSuccess 
                      ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                      : modelBuildError 
                      ? "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800"
                      : "bg-muted/50 border-muted-foreground/20"
                  }`}>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className={`h-2 w-2 rounded-full ${
                          modelBuildSuccess 
                            ? "bg-green-500" 
                            : modelBuildError 
                            ? "bg-orange-500"
                            : "bg-blue-500"
                        }`} />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {modelBuildSuccess 
                            ? "Model Number (Validated)" 
                            : modelBuildError 
                            ? "Model Number (Warning)"
                            : "Current Model Number"}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        {modelBuilder.isBuilding && (
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" data-testid="loader-model-building" />
                        )}
                        <p className="text-xl font-mono font-bold tracking-wider text-foreground" data-testid="text-dynamic-model-number">
                          {dynamicModelNumber}
                        </p>
                        {modelBuildSuccess && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded-md text-xs font-medium">
                            <Settings className="h-3 w-3" />
                            <span>Valid</span>
                          </div>
                        )}
                      </div>
                      {modelBuildError && (
                        <div className="flex items-center justify-center gap-2 mt-3 p-2 bg-orange-100 dark:bg-orange-900 rounded-md">
                          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <p className="text-sm text-orange-700 dark:text-orange-300" data-testid="text-model-build-error">
                            {modelBuildError}
                          </p>
                        </div>
                      )}
                      {lastValidModel && lastValidModel !== dynamicModelNumber && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <p className="text-xs text-muted-foreground">
                            Last Valid: <span className="font-mono font-semibold">{lastValidModel}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Enhanced Interactive Nomenclature Segments */}
                  <div className="space-y-3">
                    {nomenclatureSegments.map((segment, index) => (
                      <div 
                        key={segment.position} 
                        className={`border rounded-lg p-4 transition-all duration-200 hover-elevate ${
                          segment.isValid === false 
                            ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950" 
                            : segment.isValid === true 
                            ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950"
                            : "border-muted-foreground/20 bg-card"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Badge 
                                variant="outline" 
                                className={`text-xs font-mono ${
                                  segment.isValid === false 
                                    ? "border-red-400 text-red-700 dark:text-red-400" 
                                    : segment.isValid === true 
                                    ? "border-green-400 text-green-700 dark:text-green-400"
                                    : ""
                                }`}
                              >
                                {segment.position}
                              </Badge>
                              <span className="text-sm font-semibold text-foreground">{segment.description}</span>
                              {segment.isValid === true && (
                                <div className="h-2 w-2 bg-green-500 rounded-full" />
                              )}
                              {segment.isValid === false && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <Select 
                              value={segment.selectedValue || ""}
                              onValueChange={(value) => updateSegmentValue(segment.position, value)}
                              data-testid={`select-segment-${segment.position}`}
                              disabled={modelBuilder.isBuilding}
                            >
                              <SelectTrigger className={`w-full transition-colors ${
                                segment.isValid === false 
                                  ? "border-red-400 focus:border-red-500" 
                                  : segment.isValid === true 
                                  ? "border-green-400 focus:border-green-500"
                                  : ""
                              }`}>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {segment.options.map((option) => (
                                  <SelectItem 
                                    key={option.value} 
                                    value={option.value}
                                    data-testid={`option-${segment.position.toLowerCase().replace(/\s+/g, '-')}-${option.value}`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div>
                                        <span className="font-semibold text-foreground">{option.value}</span>
                                        <span className="text-muted-foreground ml-2">- {option.description}</span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {segment.validationMessage && (
                              <div className="flex items-center gap-1 mt-2">
                                <AlertCircle className="h-3 w-3 text-red-500" />
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  {segment.validationMessage}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <span className={`text-xl font-mono font-bold tracking-wider ${
                              segment.isValid === false 
                                ? "text-red-600 dark:text-red-400" 
                                : segment.isValid === true 
                                ? "text-green-600 dark:text-green-400"
                                : "text-primary"
                            }`}>
                              {segment.selectedValue}
                            </span>
                            {segment.isValid === true && (
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">Valid</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Enhanced Model Building Status */}
                  {(modelBuilder.isBuilding || modelBuildError || modelBuildSuccess) && (
                    <div className={`mt-4 p-4 rounded-lg border transition-all duration-300 ${
                      modelBuildSuccess 
                        ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                        : modelBuildError 
                        ? "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800"
                        : "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                    }`}>
                      {modelBuilder.isBuilding && (
                        <div className="flex items-center gap-3 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <div>
                            <p className="font-medium text-blue-700 dark:text-blue-300">Building Model Number</p>
                            <p className="text-blue-600 dark:text-blue-400 text-xs">Validating configuration...</p>
                          </div>
                        </div>
                      )}
                      {modelBuildSuccess && !modelBuilder.isBuilding && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="h-4 w-4 bg-green-600 rounded-full flex items-center justify-center">
                            <Settings className="h-2 w-2 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-green-700 dark:text-green-300">Model Number Validated</p>
                            <p className="text-green-600 dark:text-green-400 text-xs">Configuration is valid and buildable</p>
                          </div>
                        </div>
                      )}
                      {modelBuildError && !modelBuilder.isBuilding && (
                        <div className="flex items-start gap-3 text-sm">
                          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-orange-700 dark:text-orange-300">Configuration Issue</p>
                            <p className="text-orange-600 dark:text-orange-400 text-xs leading-relaxed">{modelBuildError}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Enhanced Model Building Actions */}
                  {isEditable && (
                    <div className="flex flex-wrap gap-3 mt-6">
                      <Button 
                        variant={modelBuildSuccess ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (onSpecificationUpdate) {
                            onSpecificationUpdate(dynamicModelNumber, convertToSpecifications());
                          }
                        }}
                        data-testid="button-apply-model-changes"
                        disabled={modelBuilder.isBuilding || !modelBuildSuccess}
                        className={modelBuildSuccess ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                      >
                        <Settings className="h-3 w-3 mr-2" />
                        {modelBuildSuccess ? "Apply Valid Model" : "Apply Changes"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setNomenclatureSegments(getNomenclatureBreakdown(unit.modelNumber));
                          setDynamicModelNumber(unit.modelNumber);
                          setModelBuildError(null);
                          setModelBuildSuccess(false);
                          setLastValidModel(null);
                        }}
                        data-testid="button-reset-model"
                        disabled={modelBuilder.isBuilding}
                      >
                        <AlertCircle className="h-3 w-3 mr-2" />
                        Reset to Original
                      </Button>
                      {lastValidModel && lastValidModel !== unit.modelNumber && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setDynamicModelNumber(lastValidModel);
                            setModelBuildSuccess(true);
                            setModelBuildError(null);
                          }}
                          data-testid="button-restore-last-valid"
                          disabled={modelBuilder.isBuilding}
                        >
                          <Info className="h-3 w-3 mr-2" />
                          Restore Last Valid
                        </Button>
                      )}
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
                            {unit.physicalSpecs?.dimensions ? 
                              `${unit.physicalSpecs.dimensions.length}" × ${unit.physicalSpecs.dimensions.width}" × ${unit.physicalSpecs.dimensions.height}"` :
                              typeof unit.dimensions === 'object' ? 
                                `${unit.dimensions.length}" × ${unit.dimensions.width}" × ${unit.dimensions.height}"` :
                                unit.dimensions
                            }
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
                      </div>
                    </div>
                  </div>

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
                        {unit.airflowSpecs && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nominal CFM:</span>
                              <span className="font-medium">{unit.airflowSpecs.nominalCfm.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Available ESP:</span>
                              <span className="font-medium">{unit.airflowSpecs.availableEsp}" w.c.</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Fan Type:</span>
                              <span className="font-medium">{unit.airflowSpecs.fanType}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
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
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Sound Data</h5>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Operating Level:</span>
                          <span className="font-medium">{unit.soundSpecs?.operatingLevel || unit.soundLevel} dB(A)</span>
                        </div>
                        {unit.soundSpecs?.testStandard && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Test Standard:</span>
                            <span className="font-medium">{unit.soundSpecs.testStandard}</span>
                          </div>
                        )}
                        {unit.soundSpecs?.measurement && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Measurement Distance:</span>
                              <span className="font-medium">{unit.soundSpecs.measurement.distance}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Test Conditions:</span>
                              <span className="font-medium">{unit.soundSpecs.measurement.conditions}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refrigerant Specifications */}
                <div className="space-y-4" data-testid="section-refrigerant-specifications">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    Refrigerant System
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Refrigerant System */}
                    <div className="border rounded-lg p-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Refrigerant System</h5>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Refrigerant Type:</span>
                          <span className="font-medium">{unit.refrigerantSystem?.type || unit.refrigerant}</span>
                        </div>
                        {unit.refrigerantSystem?.charge && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Charge:</span>
                            <span className="font-medium">{unit.refrigerantSystem.charge} lbs</span>
                          </div>
                        )}
                        {unit.refrigerantSystem?.lineSetSize && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Liquid Line:</span>
                              <span className="font-medium">{unit.refrigerantSystem.lineSetSize.liquid}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Suction Line:</span>
                              <span className="font-medium">{unit.refrigerantSystem.lineSetSize.suction}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
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
                          <span className="font-medium">{unit.coolingStages || 1}</span>
                        </div>
                        {unit.heatingStages && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Heating Stages:</span>
                            <span className="font-medium">{unit.heatingStages}</span>
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
                          <span className="font-medium">{unit.controlsType}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operating Conditions */}
                  <div className="border rounded-lg p-4">
                    <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Operating Conditions</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cooling Range:</span>
                          <span className="font-medium">
                            {unit.temperatureRange.cooling.min}°F to {unit.temperatureRange.cooling.max}°F
                          </span>
                        </div>
                        {unit.temperatureRange.heating && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Heating Range:</span>
                            <span className="font-medium">
                              {unit.temperatureRange.heating.min}°F to {unit.temperatureRange.heating.max}°F
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Coil Type:</span>
                          <span className="font-medium">{unit.coilType}</span>
                        </div>
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