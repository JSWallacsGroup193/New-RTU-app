import { useState, useCallback } from 'react';
import { Search, Upload, ArrowRight, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DataPlateUpload } from '@/components/DataPlateUpload';
import SpecificationSearchForm from '@/components/SpecificationSearchForm';
import SpecificationSearchResults from '@/components/SpecificationSearchResults';
import { ExtractedDataPlateData, SpecSearchInput, systemTypeEnum, tonnageEnum, combinedVoltageEnum } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface DataPlateWorkflowProps {
  onSearchComplete?: (results: any[]) => void;
  className?: string;
}

export function DataPlateWorkflow({ onSearchComplete, className = "" }: DataPlateWorkflowProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [extractedData, setExtractedData] = useState<ExtractedDataPlateData | null>(null);
  const [searchParams, setSearchParams] = useState<SpecSearchInput | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleDataExtracted = useCallback((data: { modelNumber?: string; manufacturer?: string; capacity?: string; voltage?: string; serialNumber?: string; specifications?: Record<string, string>; } | undefined) => {
    if (!data) return;
    
    setExtractedData(data as ExtractedDataPlateData);
    
    // Convert extracted data to search parameters with proper SpecSearchInput structure
    const inferredTonnage = data.capacity ? inferTonnageFromCapacity(data.capacity) : "3.0";
    const inferredVoltage = data.voltage ? inferCombinedVoltageFromString(data.voltage) : "208-230/3/60";
    const inferredSystemType = inferSystemTypeFromModel(data.modelNumber || '');
    
    const searchInput: SpecSearchInput = {
      systemType: inferredSystemType,
      tonnage: inferredTonnage,
      voltage: inferredVoltage,
      efficiency: "standard" as const
    };

    setSearchParams(searchInput);
    
    // Show success and guide user to next step
    toast({
      title: "Equipment Data Extracted",
      description: "Data plate information has been processed. Review the extracted data and search for Daikin replacements.",
      duration: 5000,
    });

  }, [toast]);

  const parseCapacityFromString = (capacityStr: string): number | undefined => {
    // Extract BTU value from strings like "4 Ton", "48,000 BTU/hr", etc.
    const btuMatch = capacityStr.match(/(\d+(?:,\d+)?)\s*BTU/i);
    if (btuMatch) {
      return parseInt(btuMatch[1].replace(',', ''));
    }
    
    const tonMatch = capacityStr.match(/(\d+(?:\.\d+)?)\s*Ton/i);
    if (tonMatch) {
      return Math.round(parseFloat(tonMatch[1]) * 12000);
    }
    
    return undefined;
  };

  const inferSystemTypeFromModel = (modelNumber: string): SpecSearchInput['systemType'] => {
    // Basic inference based on common patterns
    if (modelNumber.includes('HP') || modelNumber.includes('H')) return 'Heat Pump';
    if (modelNumber.includes('AC') || modelNumber.includes('C')) return 'Straight A/C';
    if (modelNumber.includes('G')) return 'Gas/Electric';
    return 'Heat Pump'; // Default fallback
  };

  const inferTonnageFromCapacity = (capacityStr: string): SpecSearchInput['tonnage'] => {
    const btu = parseCapacityFromString(capacityStr);
    if (!btu) return "3.0";
    
    const tonnage = btu / 12000;
    // Round to nearest standard tonnage
    const standardTonnages: SpecSearchInput['tonnage'][] = ["3.0", "3.5", "4.0", "4.5", "5.0", "6.0", "7.0", "7.5", "8.0", "8.5", "9.0", "10.0", "12.0", "12.5", "15.0", "20.0", "25.0"];
    
    let closest = standardTonnages[0];
    let minDiff = Math.abs(tonnage - parseFloat(closest));
    
    for (const std of standardTonnages) {
      const diff = Math.abs(tonnage - parseFloat(std));
      if (diff < minDiff) {
        closest = std;
        minDiff = diff;
      }
    }
    
    return closest;
  };

  const inferCombinedVoltageFromString = (voltageStr: string): SpecSearchInput['voltage'] => {
    // Try to infer voltage from string like "208-230V", "460V", etc.
    if (voltageStr.includes('208') || voltageStr.includes('230')) {
      return voltageStr.includes('3') || voltageStr.toLowerCase().includes('three') ? "208-230/3/60" : "208-230/1/60";
    }
    if (voltageStr.includes('460')) return "460/3/60";
    if (voltageStr.includes('575')) return "575/3/60";
    return "208-230/3/60"; // Default fallback
  };

  const handleManualSearch = (params: SpecSearchInput) => {
    setSearchParams(params);
    setIsSearching(true);
  };

  const handleReset = () => {
    setExtractedData(null);
    setSearchParams(null);
    setIsSearching(false);
    setActiveTab("upload");
  };

  const getWorkflowStatus = () => {
    if (extractedData && searchParams) {
      return { step: 3, status: 'ready_to_search', message: 'Ready to search for replacements' };
    } else if (extractedData) {
      return { step: 2, status: 'data_extracted', message: 'Data extracted successfully' };
    } else {
      return { step: 1, status: 'awaiting_upload', message: 'Upload data plate photo to begin' };
    }
  };

  const workflow = getWorkflowStatus();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Workflow Progress Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Data Plate Workflow
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant={workflow.status === 'ready_to_search' ? 'default' : 'secondary'}
                className="text-xs"
              >
                Step {workflow.step} of 3
              </Badge>
              
              {extractedData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-2"
                  data-testid="button-reset-workflow"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {workflow.message}
          </p>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-4 pt-4">
            <div className={`flex items-center gap-2 ${workflow.step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                workflow.step >= 1 
                  ? 'border-primary bg-primary text-primary-foreground' 
                  : 'border-muted-foreground'
              }`}>
                1
              </div>
              <span className="text-sm">Upload Photo</span>
            </div>
            
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            
            <div className={`flex items-center gap-2 ${workflow.step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                workflow.step >= 2 
                  ? 'border-primary bg-primary text-primary-foreground' 
                  : 'border-muted-foreground'
              }`}>
                2
              </div>
              <span className="text-sm">Extract Data</span>
            </div>
            
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            
            <div className={`flex items-center gap-2 ${workflow.step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                workflow.step >= 3 
                  ? 'border-primary bg-primary text-primary-foreground' 
                  : 'border-muted-foreground'
              }`}>
                3
              </div>
              <span className="text-sm">Find Replacements</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Workflow Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upload" | "manual")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="upload" 
            className="flex items-center gap-2"
            data-testid="tab-upload"
          >
            <Upload className="h-4 w-4" />
            Upload Data Plate
          </TabsTrigger>
          <TabsTrigger 
            value="manual" 
            className="flex items-center gap-2"
            data-testid="tab-manual"
          >
            <Search className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Data Plate Upload */}
          <DataPlateUpload
            onDataExtracted={handleDataExtracted}
            maxFiles={3}
            className="w-full"
          />

          {/* Extracted Data Review */}
          {extractedData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extracted Equipment Data</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review and verify the extracted information before searching for replacements.
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {extractedData.modelNumber && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Model Number
                      </label>
                      <p className="font-mono text-sm border rounded px-2 py-1 bg-muted/50">
                        {extractedData.modelNumber}
                      </p>
                    </div>
                  )}
                  
                  {extractedData.manufacturer && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Manufacturer
                      </label>
                      <p className="text-sm border rounded px-2 py-1 bg-muted/50">
                        {extractedData.manufacturer}
                      </p>
                    </div>
                  )}
                  
                  {extractedData.capacity && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Capacity
                      </label>
                      <p className="text-sm border rounded px-2 py-1 bg-muted/50">
                        {extractedData.capacity}
                      </p>
                    </div>
                  )}
                  
                  {extractedData.voltage && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Voltage
                      </label>
                      <p className="text-sm border rounded px-2 py-1 bg-muted/50">
                        {extractedData.voltage}
                      </p>
                    </div>
                  )}
                </div>

                {extractedData.specifications && Object.keys(extractedData.specifications).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Additional Specifications</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {Object.entries(extractedData.specifications).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {searchParams && (
                  <div className="pt-4">
                    <Button
                      size="lg"
                      className="w-full gap-2"
                      onClick={() => setIsSearching(true)}
                      data-testid="button-search-replacements"
                    >
                      <Search className="h-4 w-4" />
                      Find Daikin Replacements
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <SpecificationSearchForm 
            onSearch={handleManualSearch}
            onBack={() => setActiveTab("upload")}
            isLoading={false}
          />
        </TabsContent>
      </Tabs>

      {/* Search Results */}
      {isSearching && searchParams && (
        <SpecificationSearchResults
          searchResults={{ results: [], count: 0 }}
          searchParams={searchParams}
          onNewSearch={() => setIsSearching(false)}
          onBackToSpecForm={() => setIsSearching(false)}
          onUpdateSearch={(newParams) => setSearchParams(newParams)}
        />
      )}
    </div>
  );
}