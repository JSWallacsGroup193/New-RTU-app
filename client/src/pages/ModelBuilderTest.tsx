import { useState } from "react";
import EnhancedUnitCard from "@/components/EnhancedUnitCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Sample test unit for the Enhanced Unit Card
const sampleUnit = {
  id: "test-unit-1",
  modelNumber: "DSC036D3",
  systemType: "Straight A/C" as const,
  btuCapacity: 36000,
  tonnage: "3.0",
  voltage: "208-230V",
  phases: "3",
  sizeMatch: "direct" as const,
  seerRating: 14.5,
  eerRating: 12.2,
  refrigerant: "R-32",
  driveType: "Direct Drive",
  coolingStages: 1,
  soundLevel: 68,
  dimensions: {
    length: 45,
    width: 32,
    height: 28
  },
  weight: 185,
  operatingAmperage: 15.2,
  maxFuseSize: 25,
  temperatureRange: {
    cooling: { min: 65, max: 95 }
  },
  controlsType: "Electromechanical",
  coilType: "Copper/Aluminum",
  factoryOptions: [],
  fieldAccessories: []
};

export default function ModelBuilderTest() {
  const [isSelected, setIsSelected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const handleSpecificationUpdate = (newModelNumber: string, specifications: any) => {
    console.log("Model updated:", newModelNumber, specifications);
    setLastUpdate(`Updated to: ${newModelNumber} at ${new Date().toLocaleTimeString()}`);
  };

  const handleViewDetails = (unit: any) => {
    console.log("View details:", unit);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Model Builder Test Page
            <Badge variant="outline">Testing Real-time Updates</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This page tests the real-time model building functionality. 
            Change the nomenclature dropdowns below to see the model number update in real-time.
          </p>
          {lastUpdate && (
            <div className="mb-4 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-300" data-testid="text-last-update">
                ✓ {lastUpdate}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div data-testid="enhanced-unit-card-test">
        <EnhancedUnitCard
          unit={sampleUnit}
          isSelected={isSelected}
          onSelectionChange={setIsSelected}
          onViewDetails={handleViewDetails}
          isEditable={true}
          family="DSC"
          onSpecificationUpdate={handleSpecificationUpdate}
        />
      </div>
    </div>
  );
}