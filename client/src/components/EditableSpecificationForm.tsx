import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Zap, Fan, Settings, Save, RotateCcw, Edit2, X } from "lucide-react";
import { useSpecificFamilyOptions } from "@/hooks/useFamilyOptions";
import { useRealTimeModelBuilder } from "@/hooks/useModelBuilder";
import { DaikinFamilyKeys, SystemType, VoltageEnum, PhaseEnum, Tonnage } from "@shared/schema";

// Form schema for editable specifications
const editableSpecSchema = z.object({
  family: z.enum(["DSC", "DHC", "DSG", "DHG", "DSH_3to6", "DSH_7p5to10", "DHH"]),
  systemType: z.enum(["Heat Pump", "Gas/Electric", "Straight A/C"]),
  tonnage: z.enum(["1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "5.0", "6.0", "7.5", "8.5", "10.0", "12.5", "15.0", "20.0", "25.0"]),
  voltage: z.enum(["208-230", "460", "575"]),
  phases: z.enum(["1", "3"]),
  efficiency: z.enum(["standard", "high"]),
  gasBtu: z.number().optional(),
  electricKw: z.number().optional(),
  controls: z.string().optional(),
  refrigerantSystem: z.string().optional(),
  heatExchanger: z.string().optional(),
});

type EditableSpecForm = z.infer<typeof editableSpecSchema>;

interface EditableSpecificationFormProps {
  // Initial values
  family: DaikinFamilyKeys;
  modelNumber: string;
  systemType: SystemType;
  btuCapacity: number;
  voltage: string;
  phases: string;
  specifications: Array<{
    label: string;
    value: string;
    unit?: string;
  }>;
  isOriginal?: boolean;
  
  // Callbacks
  onModelUpdate?: (newModelNumber: string, specifications: any) => void;
  onSave?: (formData: EditableSpecForm) => void;
  onCancel?: () => void;
}

export default function EditableSpecificationForm({
  family,
  modelNumber,
  systemType,
  btuCapacity,
  voltage,
  phases,
  specifications,
  isOriginal = false,
  onModelUpdate,
  onSave,
  onCancel
}: EditableSpecificationFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentModelNumber, setCurrentModelNumber] = useState(modelNumber);
  
  // Get family options
  const { data: familyOptions, isLoading: optionsLoading } = useSpecificFamilyOptions(family);
  const { buildModel, isBuilding } = useRealTimeModelBuilder();

  // Extract initial values from specifications
  const getInitialValues = (): EditableSpecForm => {
    const tonnageValue = Math.round(btuCapacity / 12000 * 10) / 10;
    const mappedTonnage = tonnageValue.toString() as Tonnage;
    
    const seerSpec = specifications.find(spec => spec.label.toLowerCase().includes('seer'));
    const efficiency = seerSpec && parseFloat(seerSpec.value) >= 16 ? "high" : "standard";
    
    const gasBtuSpec = specifications.find(spec => spec.label.toLowerCase().includes('heating btu'));
    const heatKitSpec = specifications.find(spec => spec.label.toLowerCase().includes('heat kit'));
    
    return {
      family,
      systemType,
      tonnage: "10.0" as Tonnage, // Default to available tonnage
      voltage: voltage as VoltageEnum,
      phases: phases as PhaseEnum,
      efficiency: efficiency as "standard" | "high",
      gasBtu: gasBtuSpec ? parseInt(gasBtuSpec.value) : undefined,
      electricKw: heatKitSpec ? parseFloat(heatKitSpec.value) : undefined,
      controls: "A", // Default control
      refrigerantSystem: "A", // Default refrigerant system
      heatExchanger: "X", // Default heat exchanger
    };
  };

  const form = useForm<EditableSpecForm>({
    resolver: zodResolver(editableSpecSchema),
    defaultValues: getInitialValues(),
  });

  const watchedValues = form.watch();

  // Real-time model building when form values change
  useEffect(() => {
    if (!isEditing || !familyOptions?.success) return;
    
    const buildModelParams = {
      family: watchedValues.family,
      tons: parseFloat(watchedValues.tonnage),
      voltage: watchedValues.voltage,
      fan_drive: "D", // Default
      controls: watchedValues.controls || "A",
      refrig_sys: watchedValues.refrigerantSystem || "A",
      gas_btu_numeric: watchedValues.gasBtu,
      electric_kw: watchedValues.electricKw,
      heat_exchanger: watchedValues.heatExchanger || "X",
      accessories: {}, // Required field for accessories
    };

    buildModel(buildModelParams, (response) => {
      if (response?.success && response.result?.specifications) {
        const newModelNumber = response.result.specifications.modelNumber;
        setCurrentModelNumber(newModelNumber);
        onModelUpdate?.(newModelNumber, response.result.specifications);
      }
    });
  }, [watchedValues, isEditing, familyOptions, buildModel, onModelUpdate]);

  const systemTypeColors = {
    "Heat Pump": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "Gas/Electric": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", 
    "Straight A/C": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  };

  const handleSave = (data: EditableSpecForm) => {
    onSave?.(data);
    setIsEditing(false);
  };

  const handleCancel = () => {
    form.reset(getInitialValues());
    setCurrentModelNumber(modelNumber);
    setIsEditing(false);
    onCancel?.();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  // Filter options based on current selections
  const availableOptions = useMemo(() => {
    if (!familyOptions?.success) return null;
    
    return {
      tonnages: familyOptions.options.tonnage_ladder,
      voltagePhases: familyOptions.options.voltage_phase_combinations,
      gasBtuOptions: familyOptions.options.gas_btu_options || [],
      electricKwOptions: familyOptions.options.electric_kw_options || [],
      controls: familyOptions.options.controls_available,
      systemTypes: familyOptions.options.system_types,
      efficiencyLevels: familyOptions.options.efficiency_levels,
    };
  }, [familyOptions]);

  return (
    <Card className={`w-full ${isOriginal ? 'border-muted-foreground/20' : 'border-primary/20'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className={`text-lg ${isOriginal ? 'text-muted-foreground' : 'text-primary'}`}>
                Daikin Unit
              </CardTitle>
              {isBuilding && (
                <Badge variant="outline" className="animate-pulse">
                  Building...
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-1">
              {currentModelNumber}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              data-testid={`badge-system-type-${systemType.replace(/[\/\s]/g, '-').toLowerCase()}`}
              className={systemTypeColors[systemType]}
              variant="secondary"
            >
              {systemType}
            </Badge>
            
            {!isEditing ? (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleEdit}
                data-testid="button-edit-specifications"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleCancel}
                  data-testid="button-cancel-edit"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={form.handleSubmit(handleSave)}
                  data-testid="button-save-edit"
                  disabled={isBuilding}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isEditing ? (
          // Read-only view
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{btuCapacity.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">BTU/hr</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{voltage}V</p>
                  <p className="text-xs text-muted-foreground">{phases} Phase</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Fan className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {Math.round(btuCapacity / 12000 * 10) / 10}
                  </p>
                  <p className="text-xs text-muted-foreground">Tons</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              {specifications.map((spec, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-muted-foreground">{spec.label}:</span>
                  <span className="font-medium">
                    {spec.value} {spec.unit && <span className="text-muted-foreground">{spec.unit}</span>}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          // Editable form view
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                
                {/* Tonnage Selection */}
                <FormField
                  control={form.control}
                  name="tonnage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tonnage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={optionsLoading}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tonnage">
                            <SelectValue placeholder="Select tonnage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableOptions?.tonnages.map((tonnage) => (
                            <SelectItem key={tonnage.code} value={tonnage.tonnage}>
                              {tonnage.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Voltage/Phase Selection */}
                <FormField
                  control={form.control}
                  name="voltage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Voltage/Phase</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          const combo = availableOptions?.voltagePhases.find(vp => vp.voltage === value);
                          if (combo) {
                            field.onChange(value);
                            form.setValue("phases", combo.phases);
                          }
                        }} 
                        value={field.value} 
                        disabled={optionsLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-voltage">
                            <SelectValue placeholder="Select voltage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableOptions?.voltagePhases.map((combo) => (
                            <SelectItem key={`${combo.voltage}-${combo.phases}`} value={combo.voltage}>
                              {combo.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Efficiency Selection */}
                <FormField
                  control={form.control}
                  name="efficiency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Efficiency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={optionsLoading}>
                        <FormControl>
                          <SelectTrigger data-testid="select-efficiency">
                            <SelectValue placeholder="Select efficiency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableOptions?.efficiencyLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level === "high" ? "High Efficiency" : "Standard"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Conditional fields based on system type */}
              {watchedValues.systemType === "Gas/Electric" && availableOptions?.gasBtuOptions && availableOptions.gasBtuOptions.length > 0 && (
                <FormField
                  control={form.control}
                  name="gasBtu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Gas BTU Output</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString() || ""} 
                        disabled={optionsLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-gas-btu">
                            <SelectValue placeholder="Select gas BTU" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableOptions?.gasBtuOptions?.map((option) => (
                            <SelectItem key={option.code} value={option.btu_value.toString()}>
                              {option.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedValues.systemType === "Heat Pump" && availableOptions?.electricKwOptions && availableOptions.electricKwOptions.length > 0 && (
                <FormField
                  control={form.control}
                  name="electricKw"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Electric Heat Kit (kW)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseFloat(value))} 
                        value={field.value?.toString() || ""} 
                        disabled={optionsLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-electric-kw">
                            <SelectValue placeholder="Select heat kit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableOptions?.electricKwOptions?.map((option) => (
                            <SelectItem key={option.code} value={option.kw_value.toString()}>
                              {option.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Controls Selection */}
              <FormField
                control={form.control}
                name="controls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Controls</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={optionsLoading}>
                      <FormControl>
                        <SelectTrigger data-testid="select-controls">
                          <SelectValue placeholder="Select controls" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableOptions?.controls.map((control) => (
                          <SelectItem key={control} value={control}>
                            Control Type {control}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}