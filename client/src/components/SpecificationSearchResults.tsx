import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpecSearchResponse } from "@shared/schema";
import { ArrowLeft, Search, Filter } from "lucide-react";
import ReplacementGrid from "./ReplacementGrid";
import SystemTypeFilter from "./SystemTypeFilter";
import { useState } from "react";

interface SpecificationSearchResultsProps {
  searchResults: SpecSearchResponse;
  searchParams: {
    btuMin: number;
    btuMax: number;
    systemType?: "Heat Pump" | "Gas/Electric" | "Straight A/C";
    voltage?: string;
  };
  onNewSearch: () => void;
  onBackToSpecForm: () => void;
}

// Type mapping between API response and filter component
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

export default function SpecificationSearchResults({ 
  searchResults, 
  searchParams, 
  onNewSearch, 
  onBackToSpecForm 
}: SpecificationSearchResultsProps) {
  const [selectedSystemType, setSelectedSystemType] = useState<"all" | "heat-pump" | "gas-electric" | "straight-ac">("all");

  // Filter results by selected system type
  const filteredResults = selectedSystemType === "all" 
    ? searchResults.results
    : searchResults.results.filter(unit => systemTypeMap[unit.systemType] === selectedSystemType);

  const handleClearFilter = () => {
    setSelectedSystemType("all");
  };
  
  const handleViewDetails = (replacement: any) => {
    console.log("View details for:", replacement.modelNumber);
    // TODO: Implement modal or detailed view
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
              Found {searchResults.count} units matching your criteria
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

      {/* Search Criteria Summary */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search Criteria
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">BTU Range:</span>
              <div className="font-medium">
                {searchParams.btuMin.toLocaleString()} - {searchParams.btuMax.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">System Type:</span>
              <div className="font-medium">
                {searchParams.systemType || "All Types"}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Voltage:</span>
              <div className="font-medium">
                {searchParams.voltage || "All Voltages"}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Results:</span>
              <div className="font-medium text-primary">
                {searchResults.count} units
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Type Filter */}
      <div className="flex justify-center">
        <SystemTypeFilter
          selectedType={selectedSystemType}
          onTypeChange={setSelectedSystemType}
        />
      </div>

      {/* Results Grid */}
      <div className="space-y-4">
        {filteredResults.length > 0 ? (
          <>
            <div className="text-center text-muted-foreground">
              Showing {filteredResults.length} of {searchResults.count} units
              {selectedSystemType !== "all" && (
                <span> filtered by {reverseSystemTypeMap[selectedSystemType as keyof typeof reverseSystemTypeMap]}</span>
              )}
            </div>
            <ReplacementGrid 
              replacements={filteredResults.map(unit => ({
                ...unit,
                sizeMatch: "direct" as const // All spec search results are direct matches
              }))}
              onViewDetails={handleViewDetails}
            />
          </>
        ) : (
          <Card className="text-center py-8">
            <CardContent>
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Units Found</h3>
              <p className="text-muted-foreground mb-4">
                No Daikin units match the selected {selectedSystemType === "all" ? "filter" : reverseSystemTypeMap[selectedSystemType as keyof typeof reverseSystemTypeMap]} system type.
              </p>
              <Button variant="outline" onClick={() => setSelectedSystemType("all")}>
                Show All Types
              </Button>
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
      </div>
    </div>
  );
}