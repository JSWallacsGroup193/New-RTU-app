import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ModelInputForm from "./ModelInputForm";
import SearchResults from "./SearchResults";
import ErrorDisplay from "./ErrorDisplay";
import SpecificationSearchForm from "./SpecificationSearchForm";
import SpecificationSearchResults from "./SpecificationSearchResults";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database, Search, Zap } from "lucide-react";
import { decodeModelNumber, searchBySpecs } from "@/lib/api";
import { DecodeResponse, SpecSearchResponse, type SpecSearchInput } from "@shared/schema";

type AppState = "search" | "results" | "error" | "spec-search" | "spec-results";

export default function HVACDecoder() {
  const [appState, setAppState] = useState<AppState>("search");
  const [searchResults, setSearchResults] = useState<DecodeResponse | null>(null);
  const [specSearchResults, setSpecSearchResults] = useState<SpecSearchResponse | null>(null);
  const [specSearchParams, setSpecSearchParams] = useState<SpecSearchInput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

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
    setErrorMessage("");
    decodeMutation.reset();
    specSearchMutation.reset();
  };

  const handleSpecSearch = () => {
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
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-primary">Package Unit System Selector</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">The Package Unit System Selector is a specialized AI-powered HVAC matching system designed for professionals who need to replace package HVAC units. It supports model number parsing from any manufacturer and provides precise Daikin R32 replacements. The tool ensures all matches conform to Daikin's family, series, and configuration rules, and supports real-time editing, comparison, export, and learning features</p>
            </div>

            {/* Main Search Form */}
            <div className="flex justify-center">
              <ModelInputForm onSearch={handleSearch} isLoading={decodeMutation.isPending} />
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

            {/* Universal Manufacturer Support */}
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground">Universal HVAC Decoder</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  🎯 Supports <span className="text-primary font-bold">ALL Major HVAC Manufacturers</span> (26+ Brands)
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                  <span>Carrier</span>
                  <span>•</span>
                  <span>Trane</span>
                  <span>•</span>
                  <span>American Standard</span>
                  <span>•</span>
                  <span>York</span>
                  <span>•</span>
                  <span>Lennox</span>
                  <span>•</span>
                  <span>Goodman</span>
                  <span>•</span>
                  <span>Rheem</span>
                  <span>•</span>
                  <span>Bryant</span>
                  <span>•</span>
                  <span>Payne</span>
                  <span>•</span>
                  <span>Ruud</span>
                  <span>•</span>
                  <span>Amana</span>
                  <span>•</span>
                  <span>Tempstar</span>
                  <span>•</span>
                  <span>Heil</span>
                  <span>•</span>
                  <span>Comfortmaker</span>
                  <span>•</span>
                  <span>ICP Brands</span>
                  <span>•</span>
                  <span>Nordyne</span>
                  <span>•</span>
                  <span>Frigidaire</span>
                  <span>•</span>
                  <span>LG</span>
                  <span>•</span>
                  <span>Mitsubishi</span>
                  <span>•</span>
                  <span>Daikin</span>
                  <span>•</span>
                  <span>Coleman</span>
                  <span>•</span>
                  <span>And More</span>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Decodes any manufacturer model number • Provides Daikin replacements only
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : appState === "spec-search" ? (
        <div className="container mx-auto px-4 py-8">
          <SpecificationSearchForm
            onSearch={handleSpecSearchSubmit}
            onBack={handleNewSearch}
            isLoading={specSearchMutation.isPending}
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