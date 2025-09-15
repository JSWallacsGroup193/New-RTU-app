import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Edit, 
  X, 
  Check, 
  Filter, 
  Zap, 
  Gauge, 
  Thermometer,
  Settings
} from "lucide-react";
import { useState, useEffect } from "react";
import type { SpecSearchInput } from "@shared/schema";

interface InlineEditControlsProps {
  searchParams: SpecSearchInput;
  onUpdateSearch: (newParams: SpecSearchInput) => void;
  onCancel: () => void;
  resultCount: number;
}

export default function InlineEditControls({
  searchParams,
  onUpdateSearch,
  onCancel,
  resultCount
}: InlineEditControlsProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editParams, setEditParams] = useState<SpecSearchInput>(searchParams);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset edit params when search params change
  useEffect(() => {
    setEditParams(searchParams);
    setErrors({});
  }, [searchParams]);

  const tonnageOptions = [
    "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "5.0", 
    "6.0", "7.5", "10.0", "12.5", "15.0", "17.5", "20.0", "25.0"
  ];

  const voltageOptions = ["208-230", "460", "575"];
  const phaseOptions = ["1", "3"];
  const efficiencyOptions = [
    { value: "standard", label: "Standard" },
    { value: "high", label: "High Efficiency" }
  ];

  const gasCategoryOptions = ["Natural Gas", "Propane"];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate heating BTU for Gas/Electric systems
    if (editParams.systemType === "Gas/Electric" && !editParams.heatingBTU) {
      newErrors.heatingBTU = "Heating BTU is required for Gas/Electric systems";
    }

    // Validate gas category for Gas/Electric systems
    if (editParams.systemType === "Gas/Electric" && !editParams.gasCategory) {
      newErrors.gasCategory = "Gas category is required for Gas/Electric systems";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onUpdateSearch(editParams);
      setIsEditMode(false);
    }
  };

  const handleCancel = () => {
    setEditParams(searchParams);
    setErrors({});
    setIsEditMode(false);
    onCancel();
  };

  const updateParam = (key: keyof SpecSearchInput, value: any) => {
    setEditParams(prev => ({
      ...prev,
      [key]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: "" }));
    }
  };

  if (!isEditMode) {
    // View Mode - Display search criteria with edit button
    return (
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search Criteria
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
              data-testid="button-edit-search-params"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Parameters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">System Type:</span>
              <div className="font-medium">
                {searchParams.systemType}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Tonnage:</span>
              <div className="font-medium">
                {searchParams.tonnage} Ton
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Voltage:</span>
              <div className="font-medium">
                {searchParams.voltage}V
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Phases:</span>
              <div className="font-medium">
                {searchParams.voltage.includes('/1/') ? '1' : '3'} Phase
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Efficiency:</span>
              <div className="font-medium capitalize">
                {searchParams.efficiency}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Results:</span>
              <div className="font-medium text-primary">
                {resultCount} units
              </div>
            </div>
          </div>

          {/* Conditional Parameters Display */}
          {(searchParams.heatingBTU || searchParams.heatKitKW || searchParams.gasCategory) && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {searchParams.heatingBTU && (
                  <div>
                    <span className="text-muted-foreground">Heating BTU:</span>
                    <div className="font-medium">
                      {searchParams.heatingBTU.toLocaleString()} BTU/hr
                    </div>
                  </div>
                )}
                {searchParams.gasCategory && (
                  <div>
                    <span className="text-muted-foreground">Gas Category:</span>
                    <div className="font-medium">
                      {searchParams.gasCategory}
                    </div>
                  </div>
                )}
                {searchParams.heatKitKW && (
                  <div>
                    <span className="text-muted-foreground">Heat Kit Size:</span>
                    <div className="font-medium">
                      {searchParams.heatKitKW} kW
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Edit Mode - Editable form controls
  return (
    <Card className="bg-muted/50 border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Search Parameters
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              data-testid="button-cancel-edit"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              data-testid="button-save-edit"
            >
              <Check className="h-4 w-4 mr-2" />
              Update Search
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
        {/* Core Parameters */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Core Specifications
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* System Type - Read Only */}
            <div className="space-y-2">
              <Label htmlFor="systemType">System Type</Label>
              <div className="p-2 bg-muted rounded-md border">
                <Badge variant="outline">{editParams.systemType}</Badge>
              </div>
            </div>

            {/* Tonnage */}
            <div className="space-y-2">
              <Label htmlFor="tonnage">Tonnage</Label>
              <Select 
                value={editParams.tonnage} 
                onValueChange={(value) => updateParam('tonnage', value)}
              >
                <SelectTrigger data-testid="select-tonnage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tonnageOptions.map((tonnage) => (
                    <SelectItem key={tonnage} value={tonnage}>
                      {tonnage} Ton
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voltage */}
            <div className="space-y-2">
              <Label htmlFor="voltage">Voltage</Label>
              <Select 
                value={editParams.voltage} 
                onValueChange={(value) => updateParam('voltage', value)}
              >
                <SelectTrigger data-testid="select-voltage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voltageOptions.map((voltage) => (
                    <SelectItem key={voltage} value={voltage}>
                      {voltage}V
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phases - derived from voltage selection */}
            <div className="space-y-2">
              <Label htmlFor="phases">Phases</Label>
              <Select 
                value={editParams.voltage.includes('/1/') ? '1' : '3'} 
                onValueChange={(value) => {
                  // Update voltage to match selected phases
                  const currentVoltage = editParams.voltage.split('/')[0];
                  const newVoltage = `${currentVoltage}/${value}/60`;
                  updateParam('voltage', newVoltage);
                }}
              >
                <SelectTrigger data-testid="select-phases">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {phaseOptions.map((phase) => (
                    <SelectItem key={phase} value={phase}>
                      {phase} Phase
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Performance Parameters */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Performance Requirements
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Efficiency */}
            <div className="space-y-2">
              <Label htmlFor="efficiency">Efficiency Level</Label>
              <Select 
                value={editParams.efficiency} 
                onValueChange={(value) => updateParam('efficiency', value as "standard" | "high")}
              >
                <SelectTrigger data-testid="select-efficiency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {efficiencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Max Sound Level (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="maxSoundLevel">Max Sound Level (dB)</Label>
              <Input
                type="number"
                min="40"
                max="80"
                value={editParams.maxSoundLevel || ""}
                onChange={(e) => updateParam('maxSoundLevel', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g. 65"
                data-testid="input-max-sound-level"
              />
            </div>
          </div>
        </div>

        {/* Conditional System-Specific Parameters */}
        {(editParams.systemType === "Gas/Electric" || editParams.systemType === "Heat Pump") && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                System-Specific Requirements
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Heating BTU for Gas/Electric */}
                {editParams.systemType === "Gas/Electric" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="heatingBTU" className="flex items-center gap-1">
                        Heating BTU/hr
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="20000"
                        max="300000"
                        step="1000"
                        value={editParams.heatingBTU || ""}
                        onChange={(e) => updateParam('heatingBTU', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g. 80000"
                        className={errors.heatingBTU ? "border-destructive" : ""}
                        data-testid="input-heating-btu"
                      />
                      {errors.heatingBTU && (
                        <p className="text-xs text-destructive">{errors.heatingBTU}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gasCategory" className="flex items-center gap-1">
                        Gas Type
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={editParams.gasCategory || ""} 
                        onValueChange={(value) => updateParam('gasCategory', value as "Natural Gas" | "Propane")}
                      >
                        <SelectTrigger 
                          className={errors.gasCategory ? "border-destructive" : ""}
                          data-testid="select-gas-category"
                        >
                          <SelectValue placeholder="Select gas type" />
                        </SelectTrigger>
                        <SelectContent>
                          {gasCategoryOptions.map((gas) => (
                            <SelectItem key={gas} value={gas}>
                              {gas}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.gasCategory && (
                        <p className="text-xs text-destructive">{errors.gasCategory}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Heat Kit KW for Heat Pumps */}
                {editParams.systemType === "Heat Pump" && (
                  <div className="space-y-2">
                    <Label htmlFor="heatKitKW">Heat Kit Size (kW)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="25"
                      step="0.5"
                      value={editParams.heatKitKW || ""}
                      onChange={(e) => updateParam('heatKitKW', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="e.g. 10.0"
                      data-testid="input-heat-kit-kw"
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            * Required fields for {editParams.systemType} systems
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              data-testid="button-cancel-edit-bottom"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              data-testid="button-save-edit-bottom"
            >
              <Check className="h-4 w-4 mr-2" />
              Update Search ({resultCount} results)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}