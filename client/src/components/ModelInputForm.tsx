import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Zap, Info, Star } from "lucide-react";

interface EfficiencyPreference {
  preferredLevel?: "standard" | "high";
  energySavings?: boolean;
}

interface ModelInputFormProps {
  onSearch: (modelNumber: string, efficiencyPreference?: EfficiencyPreference) => void;
  isLoading?: boolean;
}

export default function ModelInputForm({ onSearch, isLoading = false }: ModelInputFormProps) {
  const [modelNumber, setModelNumber] = useState("");
  const [efficiencyLevel, setEfficiencyLevel] = useState<string>("");
  const [energySavings, setEnergySavings] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modelNumber.trim()) {
      const efficiencyPreference: EfficiencyPreference = {};
      
      if (efficiencyLevel) {
        efficiencyPreference.preferredLevel = efficiencyLevel as "standard" | "high";
      }
      
      efficiencyPreference.energySavings = energySavings;
      
      onSearch(modelNumber.trim(), Object.keys(efficiencyPreference).length > 0 ? efficiencyPreference : undefined);
    }
  };

  return (
    <TooltipProvider>
      <Card className="w-full max-w-2xl border-border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-medium">
            <Zap className="h-5 w-5 text-primary" />
            Model Number Search
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter any manufacturer model number to find Daikin replacements
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Model Number Input */}
            <div className="space-y-2">
              <Label htmlFor="model-number">Model Number</Label>
              <div className="flex gap-2">
                <Input
                  id="model-number"
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
            </div>

            <Separator />

            {/* Efficiency Preferences Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <Label className="text-base font-medium">Efficiency Preferences (Optional)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Select efficiency requirements to prioritize energy-efficient Daikin replacements and potential energy savings.</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="space-y-4">
                {/* Efficiency Level Selection */}
                <div className="space-y-2">
                  <Label htmlFor="efficiency-level">Efficiency Level</Label>
                  <Select value={efficiencyLevel} onValueChange={setEfficiencyLevel}>
                    <SelectTrigger data-testid="select-efficiency-level">
                      <SelectValue placeholder="Select efficiency level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Efficiency (13-15 SEER)</SelectItem>
                      <SelectItem value="high">High Efficiency (16-18 SEER)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                Supports all major manufacturers: Carrier, Trane, York, Lennox, Goodman, Rheem, and more
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}