import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ModelInputForm from "./ModelInputForm";
import SearchResults from "./SearchResults";
import ErrorDisplay from "./ErrorDisplay";
import SpecificationSearchForm from "./SpecificationSearchForm";
import SpecificationSearchResults from "./SpecificationSearchResults";
import { DataPlateUpload } from "./DataPlateUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database, Search, Camera } from "lucide-react";
import { decodeModelNumber, searchBySpecs } from "@/lib/api";
import { DecodeResponse, SpecSearchResponse, type SpecSearchInput } from "@shared/schema";

type AppState = "search" | "results" | "error" | "spec-search" | "spec-results" | "data-plate";

export default function HVACDecoder() {
  const [appState, setAppState] = useState<AppState>("search");
  const [searchResults, setSearchResults] = useState<DecodeResponse | null>(null);
  const [specSearchResults, setSpecSearchResults] = useState<SpecSearchResponse | null>(null);
  const [specSearchParams, setSpecSearchParams] = useState<SpecSearchInput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [extractedData, setExtractedData] = useState<any>(null);

  const decodeMutation = useMutation({
    mutationFn: decodeModelNumber,
    onSuccess: (data) => {
      setSearchResults(data);
      setAppState("results");
      setErrorMessage("");
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setAppState("error");
      setSearchResults(null);
    },
  });

  const specSearchMutation = useMutation({
    mutationFn: searchBySpecs,
    onSuccess: (data) => {
      setSpecSearchResults(data);
      setAppState("spec-results");
      setErrorMessage("");
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setAppState("error");
      setSpecSearchResults(null);
    },
  });

  const handleSearch = async (modelNumber: string, efficiencyPreference?: {
    preferredLevel?: "standard" | "high";
    energySavings?: boolean;
  }) => {
    console.log("Searching for model:", modelNumber, "with efficiency preference:", efficiencyPreference);
    decodeMutation.mutate({ modelNumber, efficiencyPreference });
  };

  const handleNewSearch = () => {
    setAppState("search");
    setSearchResults(null);
    setSpecSearchResults(null);
    setSpecSearchParams(null);
    setExtractedData(null);
    setErrorMessage("");
    decodeMutation.reset();
    specSearchMutation.reset();
  };

  const handleSpecSearch = () => {
    setAppState("spec-search");
  };

  const handleDataPlateUpload = () => {
    setAppState("data-plate");
  };

  const handleDataExtracted = (data: any) => {
    setExtractedData(data);
    // Auto-navigate to spec search with pre-filled data
    setAppState("spec-search");
  };

  const handleSpecSearchSubmit = (params: SpecSearchInput) => {
    setSpecSearchParams(params);
    // Send SpecSearchInput directly to backend - no transformation needed
    specSearchMutation.mutate(params);
  };

  const handleBackToSpecForm = () => {
    setAppState("spec-search");
    setErrorMessage("");
    specSearchMutation.reset();
  };

  const handleRetry = () => {
    setAppState("search");
    setErrorMessage("");
    decodeMutation.reset();
  };

  return (
    <div className="min-h-screen bg-background">
      {appState === "search" ? (
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Hero Section */}
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-semibold text-foreground">HVAC Universal Decoder</h1>
              <p className="text-base text-muted-foreground max-w-xl mx-auto">
                Decode any manufacturer model number and find precise Daikin R-32 package unit replacements
              </p>
            </div>

            {/* Main Search Form */}
            <div className="flex justify-center">
              <ModelInputForm onSearch={handleSearch} isLoading={decodeMutation.isPending} />
            </div>

            {/* Alternative Options */}
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <Card className="hover-elevate cursor-pointer border-border" onClick={handleSpecSearch}>
                <CardContent className="p-4 text-center space-y-2">
                  <Database className="h-6 w-6 text-primary mx-auto" />
                  <h3 className="text-base font-medium">Specification Search</h3>
                  <p className="text-sm text-muted-foreground">
                    Search by BTU, voltage, and system type
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    data-testid="button-spec-search"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search by Specs
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer border-border" onClick={handleDataPlateUpload}>
                <CardContent className="p-4 text-center space-y-2">
                  <Camera className="h-6 w-6 text-primary mx-auto" />
                  <h3 className="text-base font-medium">Data Plate Upload</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload nameplate photo for extraction
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    data-testid="button-data-plate"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Universal Manufacturer Support */}
            <div className="text-center">
              <div className="bg-muted/30 border border-border rounded-lg p-4 max-w-2xl mx-auto">
                <p className="text-sm font-medium text-foreground mb-2">
                  Universal Compatibility
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports 26+ major HVAC manufacturers including Carrier, Trane, York, Lennox, Goodman, Rheem, and more
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : appState === "data-plate" ? (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-primary mb-2">Equipment Data Plate Upload</h1>
              <p className="text-muted-foreground">
                Upload a photo of the equipment nameplate to automatically extract specifications
              </p>
            </div>
            <DataPlateUpload
              onDataExtracted={handleDataExtracted}
              maxFiles={1}
              className="max-w-2xl mx-auto"
            />
            <div className="flex justify-center mt-6">
              <Button 
                variant="outline" 
                onClick={handleNewSearch}
                data-testid="button-back-home"
              >
                Back to Main Menu
              </Button>
            </div>
          </div>
        </div>
      ) : appState === "spec-search" ? (
        <div className="container mx-auto px-4 py-8">
          <SpecificationSearchForm
            onSearch={handleSpecSearchSubmit}
            onBack={handleNewSearch}
            isLoading={specSearchMutation.isPending}
            extractedData={extractedData}
          />
        </div>
      ) : appState === "results" && searchResults ? (
        <div className="container mx-auto px-4 py-8">
          <SearchResults
            originalUnit={searchResults.originalUnit}
            replacements={searchResults.replacements}
            onNewSearch={handleNewSearch}
          />
        </div>
      ) : appState === "spec-results" && specSearchResults && specSearchParams ? (
        <SpecificationSearchResults
          searchResults={specSearchResults}
          searchParams={specSearchParams}
          onNewSearch={handleNewSearch}
          onBackToSpecForm={handleBackToSpecForm}
        />
      ) : appState === "error" ? (
        <div className="container mx-auto px-4 py-8">
          <ErrorDisplay
            message={errorMessage}
            onRetry={handleRetry}
            onNewSearch={handleNewSearch}
          />
        </div>
      ) : null}
    </div>
  );
}