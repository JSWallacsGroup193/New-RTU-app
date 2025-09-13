import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import SpecificationCard from "./SpecificationCard";
import ReplacementGrid from "./ReplacementGrid";
import SystemTypeFilter from "./SystemTypeFilter";
import ManufacturerBadge from "./ManufacturerBadge";
import ComparisonTable from "./ComparisonTable";
import { useToast } from "@/hooks/use-toast";
import { exportSingleComparison, exportBulkComparison } from "@/lib/pdfService";
import { RefreshCw, AlertCircle, Download, FileText, GitCompare, List } from "lucide-react";

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
  const [selectedReplacements, setSelectedReplacements] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<"grid" | "comparison">("grid");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

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

  const handleExportSingle = async (replacement: DaikinReplacement) => {
    setIsExporting(true);
    try {
      await exportSingleComparison(originalUnit, replacement, {
        includeProjectInfo: true,
        includeEnvironmentalBenefits: true,
        includeCostAnalysis: true
      });
      toast({
        title: "PDF Export Successful",
        description: `Comparison report for ${replacement.modelNumber} has been downloaded.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBulk = async () => {
    if (selectedReplacements.size === 0) {
      toast({
        title: "No Units Selected",
        description: "Please select at least one replacement unit to export.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      const comparisons = Array.from(selectedReplacements)
        .map(id => replacements.find(r => r.id === id))
        .filter(Boolean)
        .map(replacement => ({ original: originalUnit, replacement: replacement! }));

      await exportBulkComparison(comparisons, {
        includeProjectInfo: true,
        includeEnvironmentalBenefits: true,
        includeCostAnalysis: true
      });

      toast({
        title: "Bulk PDF Export Successful",
        description: `Multi-unit comparison report with ${comparisons.length} units has been downloaded.`,
      });
    } catch (error) {
      console.error("Bulk export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the bulk PDF report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleSelection = (replacementId: string) => {
    const newSelection = new Set(selectedReplacements);
    if (newSelection.has(replacementId)) {
      newSelection.delete(replacementId);
    } else {
      newSelection.add(replacementId);
    }
    setSelectedReplacements(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedReplacements.size === filteredReplacements.length) {
      setSelectedReplacements(new Set());
    } else {
      setSelectedReplacements(new Set(filteredReplacements.map(r => r.id)));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with controls */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Decoding Results</h1>
          <p className="text-muted-foreground">
            Model decoded with {originalUnit.confidence}% confidence
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{replacements.length} Daikin Options</Badge>
            {selectedReplacements.size > 0 && (
              <Badge variant="outline">{selectedReplacements.size} Selected</Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Export Controls */}
          {selectedReplacements.size > 0 && (
            <Button
              onClick={handleExportBulk}
              disabled={isExporting}
              variant="default"
              className="gap-2"
              data-testid="button-export-bulk"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : `Export ${selectedReplacements.size} Units`}
            </Button>
          )}
          
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

      {/* Results Section */}
      {filteredReplacements.length > 0 ? (
        <div className="space-y-6">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "grid" | "comparison")}>
                <TabsList>
                  <TabsTrigger value="grid" className="flex items-center gap-2" data-testid="tab-grid-view">
                    <List className="h-4 w-4" />
                    List View
                  </TabsTrigger>
                  <TabsTrigger value="comparison" className="flex items-center gap-2" data-testid="tab-comparison-view">
                    <GitCompare className="h-4 w-4" />
                    Comparison View
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                data-testid="button-select-all"
                className="text-xs"
              >
                {selectedReplacements.size === filteredReplacements.length ? "Deselect All" : "Select All"}
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {selectedReplacements.size} of {filteredReplacements.length} selected
              </span>
            </div>
          </div>

          {/* Results Content */}
          {activeView === "grid" ? (
            <ReplacementGrid
              replacements={filteredReplacements}
              onViewDetails={handleViewDetails}
              selectedUnits={selectedReplacements}
              onToggleSelection={handleToggleSelection}
              onExportSingle={handleExportSingle}
              isExporting={isExporting}
            />
          ) : (
            <div className="space-y-6">
              {filteredReplacements.map((replacement) => (
                <ComparisonTable
                  key={replacement.id}
                  originalUnit={originalUnit}
                  replacementUnit={replacement}
                  onExportPDF={() => handleExportSingle(replacement)}
                  showExportButton={true}
                  compact={false}
                />
              ))}
            </div>
          )}
        </div>
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