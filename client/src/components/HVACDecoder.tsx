import { useState } from "react";
import ModelInputForm from "./ModelInputForm";
import SearchResults from "./SearchResults";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database, Search, Zap } from "lucide-react";

// Mock data for demonstration - TODO: remove mock functionality
const mockOriginalUnit = {
  modelNumber: "50TCQA04",
  manufacturer: "Carrier",
  confidence: 95,
  systemType: "Heat Pump" as const,
  btuCapacity: 48000,
  voltage: "460",
  phases: "3",
  specifications: [
    { label: "SEER Rating", value: "16" },
    { label: "Refrigerant", value: "R-410A" },
    { label: "Sound Level", value: "72", unit: "dB" },
    { label: "Dimensions", value: "48 x 48 x 36", unit: "in" },
    { label: "Weight", value: "485", unit: "lbs" },
    { label: "Warranty", value: "10", unit: "years" }
  ]
};

const mockReplacements = [
  {
    id: "1",
    modelNumber: "DZ14SA0361A",
    systemType: "Heat Pump" as const,
    btuCapacity: 36000,
    voltage: "460",
    phases: "3",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "Sound Level", value: "70", unit: "dB" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Weight", value: "425", unit: "lbs" }
    ],
    sizeMatch: "smaller" as const
  },
  {
    id: "2",
    modelNumber: "DZ14SA0481A",
    systemType: "Heat Pump" as const,
    btuCapacity: 48000,
    voltage: "460",
    phases: "3",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "Sound Level", value: "72", unit: "dB" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Weight", value: "485", unit: "lbs" }
    ],
    sizeMatch: "direct" as const
  },
  {
    id: "3",
    modelNumber: "DZ14SA0601A",
    systemType: "Heat Pump" as const,
    btuCapacity: 60000,
    voltage: "460",
    phases: "3",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "Sound Level", value: "74", unit: "dB" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Weight", value: "545", unit: "lbs" }
    ],
    sizeMatch: "larger" as const
  },
  {
    id: "4",
    modelNumber: "DZ14GS0481A", 
    systemType: "Gas/Electric" as const,
    btuCapacity: 48000,
    voltage: "460",
    phases: "3",
    specifications: [
      { label: "AFUE Rating", value: "80%" },
      { label: "Sound Level", value: "70", unit: "dB" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Weight", value: "520", unit: "lbs" }
    ],
    sizeMatch: "direct" as const
  },
  {
    id: "5",
    modelNumber: "DZ14AC0481A",
    systemType: "Straight A/C" as const,  
    btuCapacity: 48000,
    voltage: "460",
    phases: "3",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "Sound Level", value: "71", unit: "dB" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Weight", value: "455", unit: "lbs" }
    ],
    sizeMatch: "direct" as const
  }
];

type AppState = "search" | "results";

export default function HVACDecoder() {
  const [appState, setAppState] = useState<AppState>("search");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (modelNumber: string) => {
    console.log("Searching for model:", modelNumber);
    setIsLoading(true);
    
    // Simulate API call - TODO: remove mock functionality
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    setAppState("results");
  };

  const handleNewSearch = () => {
    setAppState("search");
  };

  const handleSpecSearch = () => {
    console.log("Opening specification search - TODO: implement");
  };

  return (
    <div className="min-h-screen bg-background">
      {appState === "search" ? (
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-primary">Package Unit System Selector</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Decode any manufacturer's HVAC model number and find equivalent Daikin replacements. 
                Supporting all major brands with precision matching.
              </p>
            </div>

            {/* Main Search Form */}
            <div className="flex justify-center">
              <ModelInputForm onSearch={handleSearch} isLoading={isLoading} />
            </div>

            {/* Alternative Options */}
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <Card className="hover-elevate cursor-pointer" onClick={handleSpecSearch}>
                <CardContent className="p-6 text-center space-y-3">
                  <Database className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="text-lg font-semibold">Search by Specifications</h3>
                  <p className="text-sm text-muted-foreground">
                    Find Daikin units by BTU capacity, voltage, and system type
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    data-testid="button-spec-search"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Spec Search
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardContent className="p-6 text-center space-y-3">
                  <Zap className="h-8 w-8 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold text-muted-foreground">Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">
                    Batch processing for multiple model numbers
                  </p>
                  <Button variant="ghost" className="w-full" disabled>
                    Bulk Decoder
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Supported Manufacturers */}
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground">Supported Manufacturers</h3>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span>Carrier</span>
                <span>•</span>
                <span>Trane</span>
                <span>•</span>
                <span>York</span>
                <span>•</span>
                <span>Lennox</span>
                <span>•</span>
                <span>Goodman</span>
                <span>•</span>
                <span>Rheem</span>
                <span>•</span>
                <span>And More</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <SearchResults
            originalUnit={mockOriginalUnit}
            replacements={mockReplacements}
            onNewSearch={handleNewSearch}
          />
        </div>
      )}
    </div>
  );
}