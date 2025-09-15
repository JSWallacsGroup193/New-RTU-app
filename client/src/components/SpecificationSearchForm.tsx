import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Settings, Zap, Thermometer } from "lucide-react";
import { specSearchInputSchema, type SpecSearchInput } from "@shared/schema";

interface SpecificationSearchFormProps {
  onSearch: (params: SpecSearchInput) => void;
  onBack: () => void;
  isLoading: boolean;
  extractedData?: any;
}

export default function SpecificationSearchForm({ onSearch, onBack, isLoading, extractedData }: SpecificationSearchFormProps) {
  
  // Helper function to convert extracted capacity to tonnage
  const convertToTonnage = (capacity: string): string => {
    if (!capacity) return "3.0";
    
    // Extract numeric value from capacity strings like "4 Ton", "48,000 BTU/hr", etc.
    const tonMatch = capacity.match(/(\d+(?:\.\d+)?)[\s]*(?:ton|tons)/i);
    if (tonMatch) {
      return tonMatch[1];
    }
    
    // Convert BTU to tons (12,000 BTU = 1 ton)
    const btuMatch = capacity.match(/([\d,]+)[\s]*btu/i);
    if (btuMatch) {
      const btu = parseInt(btuMatch[1].replace(/,/g, ''));
      const tons = (btu / 12000).toFixed(1);
      return tons;
    }
    
    return "3.0"; // Default fallback
  };
  
  // Helper function to normalize voltage format
  const normalizeVoltage = (voltage: string): string => {
    if (!voltage) return "208-230/3/60";
    
    // Common voltage mappings
    const voltageMap: Record<string, string> = {
      "208-230V 3φ": "208-230/3/60",
      "208-230V 1φ": "208-230/1/60",
      "460V 3φ": "460/3/60",
      "575V 3φ": "575/3/60",
    };
    
    return voltageMap[voltage] || "208-230/3/60";
  };
  const form = useForm<SpecSearchInput>({
    resolver: zodResolver(specSearchInputSchema),
    defaultValues: {
      systemType: "Heat Pump",
      tonnage: extractedData?.capacity ? convertToTonnage(extractedData.capacity) : "3.0",
      voltage: extractedData?.voltage ? normalizeVoltage(extractedData.voltage) : "208-230/3/60",
      efficiency: "standard",
      heatingBTU: undefined,
      heatKitKW: undefined,
      gasCategory: undefined,
    },
  });

  const watchedSystemType = form.watch("systemType");

  const handleSubmit = (data: SpecSearchInput) => {
    onSearch(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              data-testid="button-back-spec-search"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl">Search by Specifications</CardTitle>
          </div>
          <p className="text-muted-foreground">
            Find Daikin units that match your specific requirements. Complete the required fields in order and any applicable conditional fields based on your system type.
          </p>
          {extractedData && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                <Settings className="h-4 w-4" />
                Data Pre-filled from Equipment Photo
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                {extractedData.manufacturer && extractedData.modelNumber 
                  ? `${extractedData.manufacturer} ${extractedData.modelNumber}` 
                  : 'Equipment specifications'} detected and pre-filled below. Please verify and adjust if needed.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Required Fields Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">System Configuration</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Complete all required specifications in the order shown below.
                </p>

                {/* System Type */}
                <FormField
                  control={form.control}
                  name="systemType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">1. System Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        data-testid="select-system-type"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select system type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Heat Pump">Heat Pump</SelectItem>
                          <SelectItem value="Gas/Electric">Gas/Electric</SelectItem>
                          <SelectItem value="Straight A/C">Straight A/C</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the type of HVAC system you need to replace
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tonnage */}
                <FormField
                  control={form.control}
                  name="tonnage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">2. Tonnage</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        data-testid="select-tonnage"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tonnage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3.0">3.0 Ton</SelectItem>
                          <SelectItem value="3.5">3.5 Ton</SelectItem>
                          <SelectItem value="4.0">4.0 Ton</SelectItem>
                          <SelectItem value="4.5">4.5 Ton</SelectItem>
                          <SelectItem value="5.0">5.0 Ton</SelectItem>
                          <SelectItem value="5.5">5.5 Ton</SelectItem>
                          <SelectItem value="6.0">6.0 Ton</SelectItem>
                          <SelectItem value="6.5">6.5 Ton</SelectItem>
                          <SelectItem value="7.0">7.0 Ton</SelectItem>
                          <SelectItem value="7.5">7.5 Ton</SelectItem>
                          <SelectItem value="8.0">8.0 Ton</SelectItem>
                          <SelectItem value="8.5">8.5 Ton</SelectItem>
                          <SelectItem value="9.0">9.0 Ton</SelectItem>
                          <SelectItem value="9.5">9.5 Ton</SelectItem>
                          <SelectItem value="10.0">10.0 Ton</SelectItem>
                          <SelectItem value="10.5">10.5 Ton</SelectItem>
                          <SelectItem value="11.0">11.0 Ton</SelectItem>
                          <SelectItem value="11.5">11.5 Ton</SelectItem>
                          <SelectItem value="12.0">12.0 Ton</SelectItem>
                          <SelectItem value="12.5">12.5 Ton</SelectItem>
                          <SelectItem value="13.0">13.0 Ton</SelectItem>
                          <SelectItem value="13.5">13.5 Ton</SelectItem>
                          <SelectItem value="14.0">14.0 Ton</SelectItem>
                          <SelectItem value="14.5">14.5 Ton</SelectItem>
                          <SelectItem value="15.0">15.0 Ton</SelectItem>
                          <SelectItem value="15.5">15.5 Ton</SelectItem>
                          <SelectItem value="16.0">16.0 Ton</SelectItem>
                          <SelectItem value="16.5">16.5 Ton</SelectItem>
                          <SelectItem value="17.0">17.0 Ton</SelectItem>
                          <SelectItem value="17.5">17.5 Ton</SelectItem>
                          <SelectItem value="18.0">18.0 Ton</SelectItem>
                          <SelectItem value="18.5">18.5 Ton</SelectItem>
                          <SelectItem value="19.0">19.0 Ton</SelectItem>
                          <SelectItem value="19.5">19.5 Ton</SelectItem>
                          <SelectItem value="20.0">20.0 Ton</SelectItem>
                          <SelectItem value="20.5">20.5 Ton</SelectItem>
                          <SelectItem value="21.0">21.0 Ton</SelectItem>
                          <SelectItem value="21.5">21.5 Ton</SelectItem>
                          <SelectItem value="22.0">22.0 Ton</SelectItem>
                          <SelectItem value="22.5">22.5 Ton</SelectItem>
                          <SelectItem value="23.0">23.0 Ton</SelectItem>
                          <SelectItem value="23.5">23.5 Ton</SelectItem>
                          <SelectItem value="24.0">24.0 Ton</SelectItem>
                          <SelectItem value="24.5">24.5 Ton</SelectItem>
                          <SelectItem value="25.0">25.0 Ton</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Cooling capacity of the system (1 ton = 12,000 BTU/hr)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Combined Voltage/Phase */}
                <FormField
                  control={form.control}
                  name="voltage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">3. Voltage & Phase</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        data-testid="select-voltage-phase"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select voltage and phase" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="208-230/1/60">208-230V / Single Phase</SelectItem>
                          <SelectItem value="208-230/3/60">208-230V / Three Phase</SelectItem>
                          <SelectItem value="460/3/60">460V / Three Phase</SelectItem>
                          <SelectItem value="575/3/60">575V / Three Phase</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Electrical voltage and phase configuration for the unit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Conditional Fields Section */}
              {watchedSystemType && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-orange-500" />
                    <h3 className="text-lg font-semibold">
                      {watchedSystemType} Specific Requirements
                    </h3>
                  </div>

                  {/* Gas/Electric Conditional Fields */}
                  {watchedSystemType === "Gas/Electric" && (
                    <>
                      <FormField
                        control={form.control}
                        name="heatingBTU"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Heating BTU's (Required)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="80000"
                                data-testid="input-heating-btu"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value.trim();
                                  if (value === '') {
                                    field.onChange(undefined);
                                  } else {
                                    const parsedValue = parseInt(value, 10);
                                    field.onChange(isNaN(parsedValue) ? undefined : parsedValue);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Heating capacity in BTU/hr for gas furnace portion
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gasCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Gas Category (Required)</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              data-testid="select-gas-category"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gas type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Natural Gas">Natural Gas</SelectItem>
                                <SelectItem value="Propane">Propane</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Type of gas fuel for the heating system
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {/* Heat Pump Conditional Fields */}
                  {watchedSystemType === "Heat Pump" && (
                    <FormField
                      control={form.control}
                      name="heatKitKW"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Heat Kit Size (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="10"
                              data-testid="input-heat-kit-kw"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value.trim();
                                if (value === '') {
                                  field.onChange(undefined);
                                } else {
                                  const parsedValue = parseFloat(value);
                                  field.onChange(isNaN(parsedValue) ? undefined : parsedValue);
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Electric heat kit capacity in kilowatts (kW)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {/* Efficiency Selection */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold">Efficiency Level</h3>
                </div>

                <FormField
                  control={form.control}
                  name="efficiency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Efficiency Selection</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        data-testid="select-efficiency"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select efficiency level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Standard Efficiency</SelectItem>
                          <SelectItem value="high">High Efficiency</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose between standard or high efficiency models
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
                data-testid="button-search-specs"
              >
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? "Searching..." : "Find Matching Daikin Units"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}