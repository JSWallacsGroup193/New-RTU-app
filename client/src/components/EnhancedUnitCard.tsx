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
  Settings
} from "lucide-react";
import { useState, useEffect } from "react";
import { DaikinFamilyKeys } from "@shared/schema";
import { useRealTimeModelBuilder } from "@/hooks/useModelBuilder";

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

// Enhanced unit interface
interface EnhancedUnit {
  id: string;
  modelNumber: string;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  btuCapacity: number;
  tonnage: string;
  voltage: string;
  phases: string;
  sizeMatch: "smaller" | "direct" | "larger";
  
  // Performance ratings
  seerRating: number;
  eerRating?: number;
  hspfRating?: number;
  
  // Technical specifications
  refrigerant: string;
  driveType: string;
  coolingStages: number;
  heatingStages?: number;
  soundLevel: number;
  
  // Physical specifications
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight: number;
  
  // Electrical
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
  const [activeTab, setActiveTab] = useState("nomenclature");
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

  const getEfficiencyBadge = (seer: number) => {
    if (seer >= 16) return { label: "High Efficiency", color: "bg-green-500 text-white" };
    if (seer >= 14) return { label: "Standard+", color: "bg-blue-500 text-white" };
    return { label: "Standard", color: "bg-gray-500 text-white" };
  };

  const efficiencyBadge = getEfficiencyBadge(unit.seerRating);

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

  // Get nomenclature breakdown for Daikin model numbers
  const getNomenclatureBreakdown = (model: string) => {
    if (!model || !family) return [];
    
    return [
      {
        position: "Position 1",
        code: model.charAt(0) || "D",
        description: "Manufacturer",
        options: [{ value: "D", description: "Daikin" }],
        selectedValue: model.charAt(0) || "D"
      },
      {
        position: "Position 2", 
        code: model.charAt(1) || "S",
        description: "Efficiency Level",
        options: [
          { value: "S", description: "Standard Efficiency" },
          { value: "H", description: "High Efficiency" }
        ],
        selectedValue: model.charAt(1) || "S"
      },
      {
        position: "Position 3",
        code: model.charAt(2) || "C", 
        description: "System Type",
        options: [
          { value: "C", description: "Straight A/C" },
          { value: "G", description: "Gas/Electric" },
          { value: "H", description: "Heat Pump" }
        ],
        selectedValue: model.charAt(2) || "C"
      },
      {
        position: "Position 4-6",
        code: model.substring(3, 6) || "036",
        description: "Nominal Capacity (MBH)",
        options: [
          { value: "036", description: "36,000 BTU/h (3 Ton)" },
          { value: "048", description: "48,000 BTU/h (4 Ton)" },
          { value: "060", description: "60,000 BTU/h (5 Ton)" },
          { value: "072", description: "72,000 BTU/h (6 Ton)" },
          { value: "090", description: "90,000 BTU/h (7.5 Ton)" },
          { value: "120", description: "120,000 BTU/h (10 Ton)" },
          { value: "150", description: "150,000 BTU/h (12.5 Ton)" },
          { value: "180", description: "180,000 BTU/h (15 Ton)" },
          { value: "240", description: "240,000 BTU/h (20 Ton)" },
          { value: "300", description: "300,000 BTU/h (25 Ton)" }
        ],
        selectedValue: model.substring(3, 6) || "036"
      },
      {
        position: "Position 7",
        code: model.charAt(6) || "D",
        description: "Fan/Drive Type", 
        options: [
          { value: "D", description: "Direct Drive" },
          { value: "L", description: "Medium Static" },
          { value: "W", description: "High Static" }
        ],
        selectedValue: model.charAt(6) || "D"
      },
      {
        position: "Position 8",
        code: model.charAt(7) || "3",
        description: "Voltage/Phase",
        options: [
          { value: "1", description: "208/230V 1φ" },
          { value: "3", description: "208/230V 3φ" },
          { value: "4", description: "460V 3φ" },
          { value: "7", description: "575V 3φ" }
        ],
        selectedValue: model.charAt(7) || "3"
      }
    ];
  };

  // Handle nomenclature segment changes
  const handleSegmentChange = (segmentIndex: number, newValue: string) => {
    const updatedSegments = [...nomenclatureSegments];
    updatedSegments[segmentIndex].selectedValue = newValue;
    updatedSegments[segmentIndex].code = newValue;
    
    // Rebuild model number from segments
    const newModelNumber = updatedSegments.reduce((model, segment, index) => {
      if (index === 3) { // Position 4-6 is 3 characters
        return model + segment.selectedValue;
      }
      return model + segment.selectedValue;
    }, "");
    
    setNomenclatureSegments(updatedSegments);
    setDynamicModelNumber(newModelNumber);
    
    // Trigger model update if callback provided
    if (onSpecificationUpdate) {
      onSpecificationUpdate(newModelNumber, { /* updated specs based on new model */ });
    }
  };

  // Convert unit data to the format expected by EditableSpecificationForm
  const convertToSpecifications = () => {
    return [
      { label: "SEER2 Rating", value: unit.seerRating.toString() },
      { label: "EER Rating", value: unit.eerRating?.toString() || "N/A" },
      { label: "HSPF Rating", value: unit.hspfRating?.toString() || "N/A" },
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
              <p className="text-sm font-medium">{unit.seerRating} SEER</p>
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="nomenclature" data-testid="tab-nomenclature">Nomenclature Builder</TabsTrigger>
                <TabsTrigger value="specifications" data-testid="tab-specifications">Specifications</TabsTrigger>
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
                      <p className="text-lg font-mono font-bold text-primary" data-testid="text-dynamic-model-number">
                        {dynamicModelNumber}
                      </p>
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
                        }}
                        data-testid="button-reset-model"
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="specifications" className="space-y-4">
                {/* Performance Ratings */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Performance Ratings
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SEER:</span>
                      <span className="font-medium">{unit.seerRating}</span>
                    </div>
                    {unit.eerRating && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">EER:</span>
                        <span className="font-medium">{unit.eerRating}</span>
                      </div>
                    )}
                    {unit.hspfRating && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">HSPF:</span>
                        <span className="font-medium">{unit.hspfRating}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Drive Type:</span>
                      <span className="font-medium">{unit.driveType}</span>
                    </div>
                  </div>
                </div>

                {/* Physical Specifications */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Physical Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensions:</span>
                      <span className="font-medium">
                        {unit.dimensions.length}" × {unit.dimensions.width}" × {unit.dimensions.height}"
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="font-medium">{unit.weight} lbs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sound Level:</span>
                      <span className="font-medium">{unit.soundLevel} dB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Refrigerant:</span>
                      <span className="font-medium">{unit.refrigerant}</span>
                    </div>
                  </div>
                </div>

                {/* Electrical Specifications */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Electrical Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Operating Amps:</span>
                      <span className="font-medium">{unit.operatingAmperage}A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Fuse:</span>
                      <span className="font-medium">{unit.maxFuseSize}A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cooling Stages:</span>
                      <span className="font-medium">{unit.coolingStages}</span>
                    </div>
                    {unit.heatingStages && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Heating Stages:</span>
                        <span className="font-medium">{unit.heatingStages}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* System Features */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    System Features
                  </h4>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Controls Type:</span>
                      <span className="font-medium">{unit.controlsType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coil Type:</span>
                      <span className="font-medium">{unit.coilType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Operating Range (Cooling):</span>
                      <span className="font-medium">
                        {unit.temperatureRange.cooling.min}°F to {unit.temperatureRange.cooling.max}°F
                      </span>
                    </div>
                    {unit.temperatureRange.heating && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Operating Range (Heating):</span>
                        <span className="font-medium">
                          {unit.temperatureRange.heating.min}°F to {unit.temperatureRange.heating.max}°F
                        </span>
                      </div>
                    )}
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