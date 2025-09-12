import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Zap } from "lucide-react";

interface ModelInputFormProps {
  onSearch: (modelNumber: string) => void;
  isLoading?: boolean;
}

export default function ModelInputForm({ onSearch, isLoading = false }: ModelInputFormProps) {
  const [modelNumber, setModelNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modelNumber.trim()) {
      onSearch(modelNumber.trim());
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Zap className="h-6 w-6 text-primary" />
          HVAC Universal Decoder
        </CardTitle>
        <p className="text-muted-foreground">
          Enter any manufacturer's model number to find Daikin replacements
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              data-testid="input-model-number"
              type="text"
              placeholder="Enter model number (e.g., TXV050C100A0, FB4ANF030000AAAA, 50TCQA04)"
              value={modelNumber}
              onChange={(e) => setModelNumber(e.target.value)}
              className="flex-1 text-lg"
              disabled={isLoading}
            />
            <Button 
              data-testid="button-search"
              type="submit" 
              disabled={!modelNumber.trim() || isLoading}
              className="px-6"
            >
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? "Decoding..." : "Decode"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Supports all major manufacturers: Carrier, Trane, York, Lennox, Goodman, Rheem, and more
          </p>
        </form>
      </CardContent>
    </Card>
  );
}