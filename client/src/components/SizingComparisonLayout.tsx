import EnhancedUnitCard from "./EnhancedUnitCard";
import { 
  ArrowDown,
  ArrowUp,
  Target,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";
import { type EnhancedUnit, DaikinFamilyKeys } from "@shared/schema";

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

interface SizingComparisonLayoutProps {
  units: EnhancedUnit[];
  onUnitSelect?: (unit: EnhancedUnit) => void;
  onAddToProject?: (unit: EnhancedUnit) => void;
  onViewDetails?: (unit: EnhancedUnit) => void;
  onSpecificationUpdate?: (newModelNumber: string, specifications: any) => void;
}

export default function SizingComparisonLayout({
  units,
  onUnitSelect,
  onAddToProject,
  onViewDetails,
  onSpecificationUpdate
}: SizingComparisonLayoutProps) {
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());

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

  const handleUnitSelection = (unit: EnhancedUnit, isSelected: boolean) => {
    const newSelectedUnits = new Set(selectedUnits);
    if (isSelected) {
      newSelectedUnits.add(unit.id);
    } else {
      newSelectedUnits.delete(unit.id);
    }
    setSelectedUnits(newSelectedUnits);
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

      {/* Three-Column Comparison Layout using EnhancedUnitCard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sortedUnits.map((unit) => {
          const config = getSizingConfig(unit.sizeMatch);
          const isSelected = selectedUnits.has(unit.id);
          const isDirect = unit.sizeMatch === "direct";
          const family = getFamilyFromModelNumber(unit.modelNumber);
          
          return (
            <EnhancedUnitCard
              key={unit.id}
              unit={unit}
              isSelected={isSelected}
              onSelectionChange={(selected) => handleUnitSelection(unit, selected)}
              onViewDetails={onViewDetails || (() => {})}
              onAddToProject={onAddToProject}
              variant="compact"
              sizingConfig={config}
              compactClassName={isDirect ? 'lg:scale-105 lg:shadow-lg' : ''}
              isEditable={true}
              family={family}
              onSpecificationUpdate={onSpecificationUpdate}
              data-testid={`card-unit-${unit.sizeMatch}`}
            />
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