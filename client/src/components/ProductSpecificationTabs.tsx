import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Thermometer, 
  Zap, 
  Gauge, 
  Fan, 
  Ruler, 
  Weight, 
  Volume2, 
  Snowflake, 
  Settings, 
  Activity,
  Clock,
  Hash
} from "lucide-react";
import { DaikinFamilyKeys } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ModelSpecification {
  modelNumber: string;
  tonnage: string;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  efficiency: "Standard" | "High";
  family: string;
  coolingCapacity: {
    total: number;
    sensible: number;
  };
  performanceRatings: {
    seer2: number;
    eer2: number;
    ieer: number;
  };
  heatingCapacity?: {
    total: number;
    afue?: number;
    hspf2?: number;
  };
  evaporatorSpecs: {
    fanType: string;
    airflow: number;
    staticPressure: number;
    coilType: string;
    coilRows: number;
  };
  condenserSpecs: {
    fanType: string;
    fanQuantity: number;
    motorHP: number;
    coilType: string;
  };
  compressorData: {
    type: string;
    stage: string;
    rla: number;
    lra: number;
    manufacturer: string;
  };
  electricalData: {
    phase: string;
    voltage: string;
    minCircuitAmpacity: number;
    maxOvercurrentProtection: number;
    operatingAmperage: number;
  };
  soundLevels: {
    cooling: number;
    heating?: number;
  };
  physicalSpecs: {
    operatingWeight: number;
    shippingWeight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  };
  airflowData: {
    nominalAirflow: number;
    externalStaticPressure: number;
    fanSpeed: string;
  };
}

interface ProductSpecificationTabsProps {
  modelNumber: string;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  btuCapacity: number;
  voltage: string;
  phases: string;
  family?: DaikinFamilyKeys;
  isOriginal?: boolean;
}

interface NomenclatureSegment {
  position: string;
  code: string;
  description: string;
  example?: string;
}

export default function ProductSpecificationTabs({
  modelNumber,
  systemType,
  btuCapacity,
  voltage,
  phases,
  family,
  isOriginal = false
}: ProductSpecificationTabsProps) {
  
  // Fetch detailed specifications for this model
  const { data: modelSpec, isLoading: specLoading } = useQuery<ModelSpecification | null>({
    queryKey: ['/api/specifications', modelNumber],
    queryFn: async () => {
      if (!modelNumber) return null;
      try {
        const response = await fetch(`/api/specifications/${modelNumber}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data as ModelSpecification;
      } catch (error) {
        console.error('Error fetching specifications:', error);
        return null;
      }
    },
    enabled: !!modelNumber
  });
  
  // Nomenclature breakdown for Daikin model numbers
  const getNomenclatureBreakdown = (model: string): NomenclatureSegment[] => {
    if (!model) return [];
    
    // Example: DSC036D3 = D-S-C-036-D-3
    return [
      {
        position: "Position 1",
        code: model.charAt(0) || "D",
        description: "Manufacturer - Daikin",
        example: "D = Daikin"
      },
      {
        position: "Position 2", 
        code: model.charAt(1) || "S",
        description: "Efficiency Level",
        example: "S = Standard, H = High Efficiency"
      },
      {
        position: "Position 3",
        code: model.charAt(2) || "C", 
        description: "System Type",
        example: "C = Straight A/C, G = Gas/Electric, H = Heat Pump"
      },
      {
        position: "Position 4-6",
        code: model.substring(3, 6) || "036",
        description: "Nominal Capacity (MBH)",
        example: "036 = 36,000 BTU/h (3 Ton)"
      },
      {
        position: "Position 7",
        code: model.charAt(6) || "D",
        description: "Fan/Drive Type", 
        example: "D = Direct Drive, L = Medium Static, W = High Static"
      },
      {
        position: "Position 8",
        code: model.charAt(7) || "3",
        description: "Voltage/Phase",
        example: "1 = 208/230V 1φ, 3 = 208/230V 3φ, 4 = 460V 3φ, 7 = 575V 3φ"
      }
    ];
  };

  const nomenclatureSegments = getNomenclatureBreakdown(modelNumber);
  
  const systemTypeColors = {
    "Heat Pump": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "Gas/Electric": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", 
    "Straight A/C": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  };

  return (
    <Card className={`w-full ${isOriginal ? 'border-muted-foreground/20' : 'border-primary/20'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className={`text-lg ${isOriginal ? 'text-muted-foreground' : 'text-primary'}`}>
              Daikin {modelNumber}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={systemTypeColors[systemType]} variant="secondary">
                {systemType}
              </Badge>
              {family && (
                <Badge variant="outline">
                  {family.toUpperCase()} Series
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-primary">
              {Math.round(btuCapacity / 12000 * 10) / 10} Ton
            </p>
            <p className="text-sm text-muted-foreground">
              {btuCapacity.toLocaleString()} BTU/h
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="nomenclature" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="nomenclature" 
              data-testid="tab-nomenclature"
              className="flex items-center gap-2"
            >
              <Hash className="h-4 w-4" />
              Nomenclature Breakdown
            </TabsTrigger>
            <TabsTrigger 
              value="specifications" 
              data-testid="tab-specifications"
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Product Specifications
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Nomenclature Breakdown (Editable) */}
          <TabsContent value="nomenclature" className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Model Number Breakdown: {modelNumber}
              </h3>
              <div className="grid gap-3">
                {nomenclatureSegments.map((segment, index) => (
                  <div key={index} className="border rounded-lg p-3 hover-elevate">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {segment.code}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{segment.position}</p>
                          <p className="text-xs text-muted-foreground">{segment.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{segment.example}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Product Specifications (Read-only) */}
          <TabsContent value="specifications" className="space-y-6">
            {modelSpec ? (
              <>
                {/* Performance Ratings */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-blue-500" />
                    Performance Ratings
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">SEER2:</span>
                      <span className="font-medium">{modelSpec.performanceRatings.seer2}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">EER2:</span>
                      <span className="font-medium">{modelSpec.performanceRatings.eer2}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">IEER:</span>
                      <span className="font-medium">{modelSpec.performanceRatings.ieer}</span>
                    </div>
                    {modelSpec.heatingCapacity?.hspf2 && (
                      <div className="flex justify-between p-2 bg-muted/30 rounded">
                        <span className="text-muted-foreground">HSPF2:</span>
                        <span className="font-medium">{modelSpec.heatingCapacity.hspf2}</span>
                      </div>
                    )}
                    {modelSpec.heatingCapacity?.afue && (
                      <div className="flex justify-between p-2 bg-muted/30 rounded">
                        <span className="text-muted-foreground">AFUE:</span>
                        <span className="font-medium">{modelSpec.heatingCapacity.afue}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Cooling Capacity */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Snowflake className="h-4 w-4 text-blue-500" />
                    Cooling Capacity
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Total Capacity:</span>
                      <span className="font-medium">{modelSpec.coolingCapacity.total.toLocaleString()} BTU/h</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Sensible Capacity:</span>
                      <span className="font-medium">{modelSpec.coolingCapacity.sensible.toLocaleString()} BTU/h</span>
                    </div>
                  </div>
                </div>

                {/* Heating Capacity (if applicable) */}
                {modelSpec.heatingCapacity && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-red-500" />
                        Heating Capacity
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Total Capacity:</span>
                          <span className="font-medium">{modelSpec.heatingCapacity.total.toLocaleString()} BTU/h</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Evaporator Specifications */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Fan className="h-4 w-4 text-green-500" />
                    Evaporator Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Fan Type:</span>
                      <span className="font-medium">{modelSpec.evaporatorSpecs.fanType}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Airflow:</span>
                      <span className="font-medium">{modelSpec.evaporatorSpecs.airflow} CFM</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Static Pressure:</span>
                      <span className="font-medium">{modelSpec.evaporatorSpecs.staticPressure}" WC</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Coil Rows:</span>
                      <span className="font-medium">{modelSpec.evaporatorSpecs.coilRows}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Compressor Data */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-purple-500" />
                    Compressor Data
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{modelSpec.compressorData.type}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Stage:</span>
                      <span className="font-medium">{modelSpec.compressorData.stage}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">RLA:</span>
                      <span className="font-medium">{modelSpec.compressorData.rla}A</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">LRA:</span>
                      <span className="font-medium">{modelSpec.compressorData.lra}A</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Electrical Data */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Electrical Data
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Voltage/Phase:</span>
                      <span className="font-medium">{modelSpec.electricalData.voltage} {modelSpec.electricalData.phase}φ</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Operating Amps:</span>
                      <span className="font-medium">{modelSpec.electricalData.operatingAmperage}A</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Min Circuit Ampacity:</span>
                      <span className="font-medium">{modelSpec.electricalData.minCircuitAmpacity}A</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Max Overcurrent:</span>
                      <span className="font-medium">{modelSpec.electricalData.maxOvercurrentProtection}A</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Physical Specifications */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-gray-500" />
                    Physical Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Dimensions (L×W×H):</span>
                      <span className="font-medium">
                        {modelSpec.physicalSpecs.dimensions.length}" × {modelSpec.physicalSpecs.dimensions.width}" × {modelSpec.physicalSpecs.dimensions.height}"
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Operating Weight:</span>
                      <span className="font-medium">{modelSpec.physicalSpecs.operatingWeight} lbs</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Shipping Weight:</span>
                      <span className="font-medium">{modelSpec.physicalSpecs.shippingWeight} lbs</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Sound Level:</span>
                      <span className="font-medium">{modelSpec.soundLevels.cooling} dB</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Airflow Data */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-cyan-500" />
                    Airflow Data
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Nominal Airflow:</span>
                      <span className="font-medium">{modelSpec.airflowData.nominalAirflow} CFM</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">External Static Pressure:</span>
                      <span className="font-medium">{modelSpec.airflowData.externalStaticPressure}" WC</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Fan Speed:</span>
                      <span className="font-medium">{modelSpec.airflowData.fanSpeed}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Detailed specifications not available for this model.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Model: {modelNumber}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}