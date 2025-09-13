import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Star
} from "lucide-react";
import { useState } from "react";

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
}

export default function EnhancedUnitCard({
  unit,
  isSelected,
  onSelectionChange,
  onViewDetails,
  onAddToProject,
  onGenerateQuote
}: EnhancedUnitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("specs");

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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="specs">Technical</TabsTrigger>
                <TabsTrigger value="factory">Factory Options</TabsTrigger>
                <TabsTrigger value="accessories">Field Accessories</TabsTrigger>
              </TabsList>
              
              <TabsContent value="specs" className="space-y-4">
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
              
              <TabsContent value="factory" className="space-y-4">
                {Object.entries(factoryOptionsByCategory).map(([category, options]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium mb-2">{category}</h4>
                    <div className="space-y-2">
                      {options.map((option, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div>
                            <p className="text-sm font-medium">{option.code}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                          <Badge 
                            variant={option.availability === "Standard" ? "default" : "outline"}
                            className={
                              option.availability === "Standard" ? "bg-green-100 text-green-800" :
                              option.availability === "Optional" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }
                          >
                            {option.availability}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="accessories" className="space-y-4">
                {Object.entries(fieldAccessoriesByCategory).map(([category, accessories]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium mb-2">{category}</h4>
                    <div className="space-y-2">
                      {accessories.map((accessory, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{accessory.code}</p>
                            <p className="text-xs text-muted-foreground">{accessory.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline"
                              className={
                                accessory.complexity === "Easy" ? "bg-green-100 text-green-800" :
                                accessory.complexity === "Moderate" ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              }
                            >
                              {accessory.complexity}
                            </Badge>
                            <Badge 
                              variant={accessory.compatible ? "default" : "destructive"}
                            >
                              {accessory.compatible ? "Compatible" : "Check"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}