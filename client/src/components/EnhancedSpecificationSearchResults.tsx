import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  ArrowUpDown,
  Grid3X3,
  List,
  Download,
  FileText,
  GitCompare,
  Trash2,
  Settings2,
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import { useState, useMemo } from "react";
import { SpecSearchResponse, type SpecSearchInput } from "@shared/schema";
import EnhancedUnitCard from "./EnhancedUnitCard";
import InlineEditControls from "./InlineEditControls";
import SystemTypeFilter from "./SystemTypeFilter";

interface EnhancedSpecificationSearchResultsProps {
  searchResults: SpecSearchResponse;
  searchParams: SpecSearchInput;
  onNewSearch: () => void;
  onBackToSpecForm: () => void;
  onUpdateSearch: (newParams: SpecSearchInput) => void;
}

// Enhanced unit interface with factory options and accessories
interface EnhancedUnit {
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
  coolingStages: number;
  heatingStages?: number;
  soundLevel: number;
  dimensions: { length: number; width: number; height: number };
  weight: number;
  operatingAmperage: number;
  maxFuseSize: number;
  temperatureRange: {
    cooling: { min: number; max: number };
    heating?: { min: number; max: number };
  };
  controlsType: string;
  coilType: string;
  factoryOptions: Array<{
    category: string;
    code: string;
    description: string;
    priceAdder?: number;
    availability: "Standard" | "Optional" | "N/A";
  }>;
  fieldAccessories: Array<{
    category: string;
    code: string;
    description: string;
    complexity: "Easy" | "Moderate" | "Professional Required";
    compatible: boolean;
  }>;
}

type SortOption = 
  | "efficiency-desc" 
  | "efficiency-asc" 
  | "capacity-desc" 
  | "capacity-asc" 
  | "sound-asc" 
  | "sound-desc"
  | "size-match";

type ViewMode = "grid" | "list";

export default function EnhancedSpecificationSearchResults({
  searchResults,
  searchParams,
  onNewSearch,
  onBackToSpecForm,
  onUpdateSearch
}: EnhancedSpecificationSearchResultsProps) {
  // State management
  const [selectedSystemType, setSelectedSystemType] = useState<"all" | "heat-pump" | "gas-electric" | "straight-ac">("all");
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("size-match");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filter states
  const [minSEER, setMinSEER] = useState<number | undefined>();
  const [maxSEER, setMaxSEER] = useState<number | undefined>();
  const [maxSoundLevel, setMaxSoundLevel] = useState<number | undefined>();
  const [highEfficiencyOnly, setHighEfficiencyOnly] = useState(false);
  const [quietOperationOnly, setQuietOperationOnly] = useState(false);

  // Transform search results to enhanced units
  const enhancedUnits: EnhancedUnit[] = useMemo(() => {
    return searchResults.results.map(unit => ({
      id: unit.id,
      modelNumber: unit.modelNumber,
      systemType: unit.systemType,
      btuCapacity: unit.btuCapacity,
      tonnage: (unit.btuCapacity / 12000).toFixed(1),
      voltage: unit.voltage,
      phases: unit.phases,
      sizeMatch: "direct" as const, // All spec search results are direct matches
      seerRating: 16.5, // Mock SEER rating
      eerRating: 13.2,
      hspfRating: unit.systemType === "Heat Pump" ? 9.5 : undefined,
      refrigerant: "R-32",
      driveType: "Variable Speed",
      coolingStages: 2,
      heatingStages: unit.systemType !== "Straight A/C" ? 2 : undefined,
      soundLevel: 65,
      dimensions: { length: 84, width: 38, height: 84 },
      weight: 350,
      operatingAmperage: 28.5,
      maxFuseSize: 45,
      temperatureRange: {
        cooling: { min: 65, max: 115 },
        heating: unit.systemType !== "Straight A/C" ? { min: -5, max: 65 } : undefined
      },
      controlsType: "Intelligent Touch",
      coilType: "Microchannel",
      factoryOptions: [
        {
          category: "Controls & Sensors",
          code: "DCS502A52",
          description: "WiFi Thermostat Module",
          availability: "Optional" as const
        },
        {
          category: "Electrical",
          code: "DKEVR005",
          description: "5kW Electric Heat Kit",
          availability: "Optional" as const
        }
      ],
      fieldAccessories: [
        {
          category: "Installation Hardware",
          code: "DVK401A",
          description: "Vibration Isolation Kit",
          complexity: "Easy" as const,
          compatible: true
        },
        {
          category: "Control Accessories",
          code: "DRS452B",
          description: "Remote Sensor Kit",
          complexity: "Moderate" as const,
          compatible: true
        }
      ]
    }));
  }, [searchResults.results]);

  // Type mapping for filtering
  const systemTypeMap = {
    "Heat Pump": "heat-pump",
    "Gas/Electric": "gas-electric", 
    "Straight A/C": "straight-ac"
  } as const;

  // Filter and sort units
  const filteredAndSortedUnits = useMemo(() => {
    let filtered = enhancedUnits;

    // Filter by system type
    if (selectedSystemType !== "all") {
      filtered = filtered.filter(unit => 
        systemTypeMap[unit.systemType] === selectedSystemType
      );
    }

    // Advanced filters
    if (minSEER) {
      filtered = filtered.filter(unit => unit.seerRating >= minSEER);
    }
    if (maxSEER) {
      filtered = filtered.filter(unit => unit.seerRating <= maxSEER);
    }
    if (maxSoundLevel) {
      filtered = filtered.filter(unit => unit.soundLevel <= maxSoundLevel);
    }
    if (highEfficiencyOnly) {
      filtered = filtered.filter(unit => unit.seerRating >= 16);
    }
    if (quietOperationOnly) {
      filtered = filtered.filter(unit => unit.soundLevel <= 60);
    }

    // Sort units
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "efficiency-desc":
          return b.seerRating - a.seerRating;
        case "efficiency-asc":
          return a.seerRating - b.seerRating;
        case "capacity-desc":
          return b.btuCapacity - a.btuCapacity;
        case "capacity-asc":
          return a.btuCapacity - b.btuCapacity;
        case "sound-asc":
          return a.soundLevel - b.soundLevel;
        case "sound-desc":
          return b.soundLevel - a.soundLevel;
        case "size-match":
          const sizeOrder = { "direct": 0, "smaller": 1, "larger": 2 };
          return sizeOrder[a.sizeMatch] - sizeOrder[b.sizeMatch];
        default:
          return 0;
      }
    });
  }, [enhancedUnits, selectedSystemType, minSEER, maxSEER, maxSoundLevel, highEfficiencyOnly, quietOperationOnly, sortBy]);

  // Selection handlers
  const handleSelectUnit = (unitId: string, selected: boolean) => {
    const newSelection = new Set(selectedUnits);
    if (selected) {
      newSelection.add(unitId);
    } else {
      newSelection.delete(unitId);
    }
    setSelectedUnits(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUnits(new Set(filteredAndSortedUnits.map(unit => unit.id)));
    } else {
      setSelectedUnits(new Set());
    }
  };

  const clearFilters = () => {
    setSelectedSystemType("all");
    setMinSEER(undefined);
    setMaxSEER(undefined);
    setMaxSoundLevel(undefined);
    setHighEfficiencyOnly(false);
    setQuietOperationOnly(false);
  };

  // Action handlers
  const handleViewDetails = (unit: EnhancedUnit) => {
    console.log("View details for:", unit.modelNumber);
    // TODO: Implement modal or detailed view
  };

  const handleAddToProject = (unit: EnhancedUnit) => {
    console.log("Add to project:", unit.modelNumber);
    // TODO: Implement project management
  };

  const handleGenerateQuote = (unit: EnhancedUnit) => {
    console.log("Generate quote for:", unit.modelNumber);
    // TODO: Implement quote generation
  };

  const handleCompareSelected = () => {
    console.log("Compare units:", Array.from(selectedUnits));
    // TODO: Implement comparison view
  };

  const handleExportSelected = () => {
    console.log("Export units:", Array.from(selectedUnits));
    // TODO: Implement export functionality
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
              Found {searchResults.count} units • {filteredAndSortedUnits.length} after filtering
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

      {/* Inline Edit Controls for Search Parameters */}
      <InlineEditControls
        searchParams={searchParams}
        onUpdateSearch={onUpdateSearch}
        onCancel={onBackToSpecForm}
        resultCount={filteredAndSortedUnits.length}
      />

      {/* Controls Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* System Type Filter */}
        <div className="flex-1">
          <SystemTypeFilter
            selectedType={selectedSystemType}
            onTypeChange={setSelectedSystemType}
          />
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-4">
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-select" className="text-sm font-medium">Sort:</Label>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]" data-testid="select-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="size-match">Size Match</SelectItem>
                <SelectItem value="efficiency-desc">SEER High to Low</SelectItem>
                <SelectItem value="efficiency-asc">SEER Low to High</SelectItem>
                <SelectItem value="capacity-desc">BTU High to Low</SelectItem>
                <SelectItem value="capacity-asc">BTU Low to High</SelectItem>
                <SelectItem value="sound-asc">Quietest First</SelectItem>
                <SelectItem value="sound-desc">Loudest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card className={`transition-all duration-200 ${showAdvancedFilters ? 'bg-muted/30' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              data-testid="button-toggle-advanced-filters"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        
        {showAdvancedFilters && (
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* SEER Range */}
              <div className="space-y-2">
                <Label htmlFor="min-seer">Min SEER</Label>
                <Input
                  type="number"
                  min="13"
                  max="25"
                  step="0.5"
                  value={minSEER || ""}
                  onChange={(e) => setMinSEER(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="13.0"
                  data-testid="input-min-seer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-seer">Max SEER</Label>
                <Input
                  type="number"
                  min="13"
                  max="25"
                  step="0.5"
                  value={maxSEER || ""}
                  onChange={(e) => setMaxSEER(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="25.0"
                  data-testid="input-max-seer"
                />
              </div>

              {/* Sound Level */}
              <div className="space-y-2">
                <Label htmlFor="max-sound">Max Sound Level (dB)</Label>
                <Input
                  type="number"
                  min="40"
                  max="80"
                  value={maxSoundLevel || ""}
                  onChange={(e) => setMaxSoundLevel(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="65"
                  data-testid="input-max-sound"
                />
              </div>

              {/* Quick Filters */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="high-efficiency"
                    checked={highEfficiencyOnly}
                    onCheckedChange={(checked) => setHighEfficiencyOnly(checked === true)}
                    data-testid="checkbox-high-efficiency"
                  />
                  <Label htmlFor="high-efficiency" className="text-sm">High Efficiency Only (16+ SEER)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="quiet-operation"
                    checked={quietOperationOnly}
                    onCheckedChange={(checked) => setQuietOperationOnly(checked === true)}
                    data-testid="checkbox-quiet-operation"
                  />
                  <Label htmlFor="quiet-operation" className="text-sm">Quiet Operation (≤60 dB)</Label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                {filteredAndSortedUnits.length} units match your filters
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedUnits.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-primary/10">
                  {selectedUnits.size} units selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUnits(new Set())}
                  data-testid="button-clear-selection"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompareSelected}
                  disabled={selectedUnits.size < 2}
                  data-testid="button-compare-selected"
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare ({selectedUnits.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                  data-testid="button-export-selected"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Select All Checkbox */}
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selectedUnits.size === filteredAndSortedUnits.length && filteredAndSortedUnits.length > 0}
          onCheckedChange={handleSelectAll}
          data-testid="checkbox-select-all"
        />
        <Label className="text-sm font-medium">
          Select All ({filteredAndSortedUnits.length} units)
        </Label>
      </div>

      {/* Results Grid/List */}
      <div className="space-y-4">
        {filteredAndSortedUnits.length > 0 ? (
          <div className={
            viewMode === "grid" 
              ? "grid gap-6 lg:grid-cols-1 xl:grid-cols-2" 
              : "space-y-4"
          }>
            {filteredAndSortedUnits.map((unit) => (
              <EnhancedUnitCard
                key={unit.id}
                unit={unit}
                isSelected={selectedUnits.has(unit.id)}
                onSelectionChange={(selected) => handleSelectUnit(unit.id, selected)}
                onViewDetails={handleViewDetails}
                onAddToProject={handleAddToProject}
                onGenerateQuote={handleGenerateQuote}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <CardContent>
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Units Found</h3>
              <p className="text-muted-foreground mb-4">
                No units match your current filters. Try adjusting your criteria.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button variant="outline" onClick={() => setSelectedSystemType("all")}>
                  Show All Types
                </Button>
              </div>
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
        {selectedUnits.size > 0 && (
          <Button
            className="flex-1"
            onClick={handleCompareSelected}
            data-testid="button-compare-footer"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Report ({selectedUnits.size})
          </Button>
        )}
      </div>
    </div>
  );
}