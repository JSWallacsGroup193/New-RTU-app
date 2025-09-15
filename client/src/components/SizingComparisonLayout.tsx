import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Thermometer, 
  Zap, 
  Volume2, 
  Ruler, 
  Weight, 
  Plus,
  ArrowDown,
  ArrowUp,
  Target,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";

// Enhanced unit interface for the comparison layout
interface ComparisonUnit {
  id: string;
  modelNumber: string;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  btuCapacity: number;
  tonnage: string;
  voltage: string;
  phases: string;
  sizeMatch: "smaller" | "direct" | "larger";
  seerRating: number;
  eerRating?: number;
  hspfRating?: number;
  refrigerant: string;
  driveType: string;
  soundLevel: number;
  dimensions: { length: number; width: number; height: number };
  weight: number;
  operatingAmperage: number;
  maxFuseSize: number;
}

interface SizingComparisonLayoutProps {
  units: ComparisonUnit[];
  onUnitSelect?: (unit: ComparisonUnit) => void;
  onAddToProject?: (unit: ComparisonUnit) => void;
  onViewDetails?: (unit: ComparisonUnit) => void;
}

export default function SizingComparisonLayout({
  units,
  onUnitSelect,
  onAddToProject,
  onViewDetails
}: SizingComparisonLayoutProps) {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  // Sort units to ensure proper order: Downsize | Direct | Upsize
  const sortedUnits = units.sort((a, b) => {
    const order = { "smaller": 0, "direct": 1, "larger": 2 };
    return order[a.sizeMatch] - order[b.sizeMatch];
  });

  const getSizingConfig = (sizeMatch: "smaller" | "direct" | "larger") => {
    switch (sizeMatch) {
      case "smaller":
        return {
          title: "DOWNSIZE",
          subtitle: "Smaller Capacity",
          icon: <ArrowDown className="w-5 h-5" />,
          color: "bg-orange-500",
          borderColor: "border-orange-500",
          badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
          description: "Conservative sizing option"
        };
      case "direct":
        return {
          title: "DIRECT MATCH",
          subtitle: "Recommended",
          icon: <Target className="w-5 h-5" />,
          color: "bg-green-500",
          borderColor: "border-green-500",
          badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          description: "Optimal sizing choice"
        };
      case "larger":
        return {
          title: "UPSIZE", 
          subtitle: "Larger Capacity",
          icon: <ArrowUp className="w-5 h-5" />,
          color: "bg-blue-500",
          borderColor: "border-blue-500",
          badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
          description: "Safety margin option"
        };
    }
  };

  const formatTonnage = (btuCapacity: number) => {
    const tonnage = btuCapacity / 12000;
    return tonnage % 1 === 0 ? `${tonnage}.0` : tonnage.toFixed(1);
  };

  const handleUnitClick = (unit: ComparisonUnit) => {
    setSelectedUnit(unit.id);
    onUnitSelect?.(unit);
  };

  if (sortedUnits.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No sizing comparison available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          HVAC Sizing Comparison
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose the optimal capacity for your installation requirements
        </p>
      </div>

      {/* Three-Column Comparison Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sortedUnits.map((unit) => {
          const config = getSizingConfig(unit.sizeMatch);
          const isSelected = selectedUnit === unit.id;
          const isDirect = unit.sizeMatch === "direct";
          
          return (
            <Card 
              key={unit.id}
              className={`relative transition-all duration-200 cursor-pointer hover-elevate ${
                isSelected ? `ring-2 ${config.borderColor}` : ''
              } ${isDirect ? 'lg:scale-105 lg:shadow-lg' : ''}`}
              onClick={() => handleUnitClick(unit)}
              data-testid={`card-unit-${unit.sizeMatch}`}
            >
              {/* Sizing Badge Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`${config.color} text-white p-2 rounded-lg`}>
                      {config.icon}
                    </div>
                    <div>
                      <Badge className={config.badgeClass} data-testid={`badge-${unit.sizeMatch}`}>
                        {config.title}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.subtitle}
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
                </div>

                {/* Prominent Capacity Display */}
                <div className="text-center bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Thermometer className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">CAPACITY</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-foreground" data-testid={`text-capacity-${unit.sizeMatch}`}>
                      {formatTonnage(unit.btuCapacity)} Tons
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {unit.btuCapacity.toLocaleString()} BTU/h
                    </div>
                  </div>
                </div>

                {/* Key Specifications */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">SEER:</span>
                      <span className="font-medium" data-testid={`text-seer-${unit.sizeMatch}`}>
                        {unit.seerRating}
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
                      onViewDetails?.(unit);
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
                    {config.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Usage Guidelines */}
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <ArrowDown className="w-4 h-4 mx-auto mb-1 text-orange-500" />
            <p className="font-medium">Downsize</p>
            <p>Conservative load, tight spaces, budget constraints</p>
          </div>
          <div className="text-center">
            <Target className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <p className="font-medium">Direct Match</p>
            <p>Optimal efficiency, standard installation</p>
          </div>
          <div className="text-center">
            <ArrowUp className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="font-medium">Upsize</p>
            <p>Safety margin, future expansion, extreme climates</p>
          </div>
        </div>
      </div>
    </div>
  );
}