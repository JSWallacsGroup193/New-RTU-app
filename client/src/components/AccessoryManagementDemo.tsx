import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import SpecificationCard from "./SpecificationCard";
import EnhancedUnitCard from "./EnhancedUnitCard";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Package, Settings } from "lucide-react";

// Demo data
const demoSpecifications = [
  { label: "SEER Rating", value: "16.6" },
  { label: "EER Rating", value: "12.5" },
  { label: "Refrigerant", value: "R-32" },
  { label: "Sound Level", value: "64", unit: "dB" },
  { label: "Operating Amperage", value: "18.2", unit: "A" },
  { label: "Max Fuse Size", value: "25", unit: "A" },
];

const demoEnhancedUnit = {
  id: "demo-unit-1",
  modelNumber: "DHC060A3",
  systemType: "Straight A/C" as const,
  btuCapacity: 60000,
  tonnage: "5.0",
  voltage: "208-230",
  phases: "3",
  sizeMatch: "direct" as const,
  seerRating: 16.6,
  eerRating: 12.5,
  refrigerant: "R-32",
  driveType: "Variable Speed ECM",
  coolingStages: 2,
  soundLevel: 64,
  dimensions: { length: 75, width: 30, height: 32 },
  weight: 285,
  operatingAmperage: 18.2,
  maxFuseSize: 25,
  temperatureRange: {
    cooling: { min: 55, max: 125 },
    heating: { min: 0, max: 65 }
  },
  controlsType: "DDC/BACnet",
  coilType: "Microchannel",
  factoryOptions: [],
  fieldAccessories: []
};

export default function AccessoryManagementDemo() {
  // State management for selected accessories
  const [selectedFactoryOptions, setSelectedFactoryOptions] = useState<string[]>([]);
  const [selectedFieldAccessories, setSelectedFieldAccessories] = useState<string[]>([]);

  // Calculate total pricing for selected factory options
  const calculateTotalPrice = () => {
    // This would normally calculate from actual pricing data
    const mockPrices: Record<string, number> = {
      "HKR": 450, "HKR15": 580, "HKR20": 720,
      "DIS": 125, "CUR": 95, "LPS": 85,
      "DFT": 180, "APP": 225, "DCV": 350
    };
    
    return selectedFactoryOptions.reduce((total, code) => {
      return total + (mockPrices[code] || 0);
    }, 0);
  };

  // Handle factory options change
  const handleFactoryOptionsChange = (selectedOptions: string[]) => {
    setSelectedFactoryOptions(selectedOptions);
  };

  // Handle field accessories change
  const handleFieldAccessoriesChange = (selectedAccessories: string[]) => {
    setSelectedFieldAccessories(selectedAccessories);
  };

  const totalPrice = calculateTotalPrice();

  return (
    <div className="space-y-6 p-6" data-testid="accessory-management-demo">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Accessory Management Demo</h2>
            <p className="text-muted-foreground">
              Comprehensive accessory selection for Daikin HVAC systems
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <Badge variant="outline" className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {selectedFactoryOptions.length + selectedFieldAccessories.length} Selected
              </Badge>
            </div>
            {totalPrice > 0 && (
              <div className="text-center">
                <Badge variant="default" className="bg-green-600 text-white flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  +${totalPrice}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Demo Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Settings className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{selectedFactoryOptions.length}</div>
                <div className="text-sm text-muted-foreground">Factory Options</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{selectedFieldAccessories.length}</div>
                <div className="text-sm text-muted-foreground">Field Accessories</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">${totalPrice}</div>
                <div className="text-sm text-muted-foreground">Total Add-On Cost</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Demo Components */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">SpecificationCard with Accessory Management</h3>
          <SpecificationCard
            title="Daikin DHC060A3"
            modelNumber="DHC060A3"
            systemType="Straight A/C"
            btuCapacity={60000}
            voltage="208-230"
            phases="3"
            specifications={demoSpecifications}
            isOriginal={false}
            isEditable={true}
            family="DHC"
            showAccessories={true}
            selectedFactoryOptions={selectedFactoryOptions}
            selectedFieldAccessories={selectedFieldAccessories}
            onFactoryOptionsChange={handleFactoryOptionsChange}
            onFieldAccessoriesChange={handleFieldAccessoriesChange}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">EnhancedUnitCard with Accessory Management</h3>
          <EnhancedUnitCard
            unit={demoEnhancedUnit}
            isSelected={false}
            onSelectionChange={(selected) => console.log('Selection changed:', selected)}
            onViewDetails={(unit) => console.log('View details:', unit)}
            onAddToProject={(unit) => console.log('Add to project:', unit)}
            onGenerateQuote={(unit) => console.log('Generate quote:', unit)}
            isEditable={true}
            family="DHC"
            showAccessories={true}
            selectedFactoryOptions={selectedFactoryOptions}
            selectedFieldAccessories={selectedFieldAccessories}
            onFactoryOptionsChange={handleFactoryOptionsChange}
            onFieldAccessoriesChange={handleFieldAccessoriesChange}
          />
        </div>
      </div>

      {/* Selected Accessories Summary */}
      {(selectedFactoryOptions.length > 0 || selectedFieldAccessories.length > 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Selected Accessories Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedFactoryOptions.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Factory Installed Options:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFactoryOptions.map((code) => (
                    <Badge key={code} variant="default" className="bg-blue-100 text-blue-800">
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {selectedFieldAccessories.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Field Accessories:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFieldAccessories.map((code) => (
                    <Badge key={code} variant="outline" className="bg-green-100 text-green-800">
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}