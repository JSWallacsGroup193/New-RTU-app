import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ModelInputForm from "./ModelInputForm";
import SearchResults from "./SearchResults";
import ErrorDisplay from "./ErrorDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database, Search, Zap } from "lucide-react";
import { decodeModelNumber } from "@/lib/api";
import { DecodeResponse } from "@shared/schema";

type AppState = "search" | "results" | "error";

export default function HVACDecoder() {
  const [appState, setAppState] = useState<AppState>("search");
  const [searchResults, setSearchResults] = useState<DecodeResponse | null>(null);
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

  const handleSearch = async (modelNumber: string) => {
    console.log("Searching for model:", modelNumber);
    decodeMutation.mutate(modelNumber);
  };

  const handleNewSearch = () => {
    setAppState("search");
    setSearchResults(null);
    setErrorMessage("");
    decodeMutation.reset();
  };

  const handleSpecSearch = () => {
    console.log("Opening specification search - TODO: implement");
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
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Decode any manufacturer's HVAC model number and find equivalent Daikin replacements. 
                Supporting all major brands with precision matching.
              </p>
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
      ) : appState === "results" && searchResults ? (
        <div className="container mx-auto px-4 py-8">
          <SearchResults
            originalUnit={searchResults.originalUnit}
            replacements={searchResults.replacements}
            onNewSearch={handleNewSearch}
          />
        </div>
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