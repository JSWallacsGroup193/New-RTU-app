import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import SpecificationCard from "./SpecificationCard";
import ReplacementGrid from "./ReplacementGrid";
import SystemTypeFilter from "./SystemTypeFilter";
import ManufacturerBadge from "./ManufacturerBadge";
import { RefreshCw, AlertCircle } from "lucide-react";

interface OriginalUnit {
  modelNumber: string;
  manufacturer: string;
  confidence: number;
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

interface DaikinReplacement {
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
  sizeMatch: "smaller" | "direct" | "larger";
}

interface SearchResultsProps {
  originalUnit: OriginalUnit;
  replacements: DaikinReplacement[];
  onNewSearch: () => void;
}

export default function SearchResults({ originalUnit, replacements, onNewSearch }: SearchResultsProps) {
  const [systemTypeFilter, setSystemTypeFilter] = useState<"all" | "heat-pump" | "gas-electric" | "straight-ac">("all");

  const filteredReplacements = replacements.filter(replacement => {
    if (systemTypeFilter === "all") return true;
    
    const filterMap = {
      "heat-pump": "Heat Pump",
      "gas-electric": "Gas/Electric", 
      "straight-ac": "Straight A/C"
    };
    
    return replacement.systemType === filterMap[systemTypeFilter];
  });

  const handleViewDetails = (replacement: DaikinReplacement) => {
    console.log("Viewing details for:", replacement.modelNumber);
    // TODO: Open detailed view/modal
  };

  return (
    <div className="space-y-8">
      {/* Header with new search button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Decoding Results</h1>
          <p className="text-muted-foreground">
            Model decoded with {originalUnit.confidence}% confidence
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={onNewSearch}
          data-testid="button-new-search"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          New Search
        </Button>
      </div>

      {/* Original Unit Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Original Unit</h2>
          <ManufacturerBadge 
            manufacturer={originalUnit.manufacturer}
            confidence={originalUnit.confidence}
          />
        </div>
        
        <SpecificationCard
          title={`${originalUnit.manufacturer} Original Unit`}
          modelNumber={originalUnit.modelNumber}
          systemType={originalUnit.systemType}
          btuCapacity={originalUnit.btuCapacity}
          voltage={originalUnit.voltage}
          phases={originalUnit.phases}
          specifications={originalUnit.specifications}
          isOriginal={true}
        />
      </div>

      <Separator />

      {/* System Type Filter */}
      <SystemTypeFilter
        selectedType={systemTypeFilter}
        onTypeChange={setSystemTypeFilter}
      />

      {/* Replacement Results */}
      {filteredReplacements.length > 0 ? (
        <ReplacementGrid
          replacements={filteredReplacements}
          onViewDetails={handleViewDetails}
        />
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-medium">No Matches Found</h3>
              <p className="text-muted-foreground">
                No Daikin replacements available for the selected system type filter.
                Try adjusting the filter or search for a different model.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setSystemTypeFilter("all")}
              data-testid="button-clear-filter"
            >
              Clear Filter
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}