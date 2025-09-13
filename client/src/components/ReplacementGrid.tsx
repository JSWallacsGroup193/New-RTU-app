import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import SpecificationCard from "./SpecificationCard";
import { ArrowDown, ArrowUp, Equal, ExternalLink, Download, CheckSquare, Square, Zap, Leaf } from "lucide-react";

interface DaikinReplacement {
  id: string;
  modelNumber: string;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  btuCapacity: number;
  voltage: string;
  phases: string;
  specifications: Array<{
    label: string;
    value: string;
    unit?: string;
  }>;
  sizeMatch: "smaller" | "direct" | "larger";
}

interface ReplacementGridProps {
  replacements: DaikinReplacement[];
  onViewDetails: (replacement: DaikinReplacement) => void;
  selectedUnits?: Set<string>;
  onToggleSelection?: (replacementId: string) => void;
  onExportSingle?: (replacement: DaikinReplacement) => void;
  isExporting?: boolean;
}

export default function ReplacementGrid({ 
  replacements, 
  onViewDetails,
  selectedUnits = new Set(),
  onToggleSelection,
  onExportSingle,
  isExporting = false
}: ReplacementGridProps) {
  const sizeMatchConfig = {
    smaller: {
      icon: ArrowDown,
      label: "Size Smaller",
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    },
    direct: {
      icon: Equal,
      label: "Direct Match",
      color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    },
    larger: {
      icon: ArrowUp,
      label: "Size Larger", 
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    }
  };

  // Helper function to extract SEER rating from specifications
  const getSEERRating = (specifications: Array<{label: string; value: string; unit?: string}>) => {
    const seerSpec = specifications.find(spec => 
      spec.label.toLowerCase().includes('seer')
    );
    return seerSpec ? parseFloat(seerSpec.value) : null;
  };

  // Helper function to get efficiency level badge
  const getEfficiencyBadge = (seerRating: number | null) => {
    if (!seerRating) return null;
    
    if (seerRating >= 16) {
      return { level: "High", color: "bg-blue-500 text-white", icon: Zap };
    } else if (seerRating >= 13) {
      return { level: "Standard", color: "bg-gray-500 text-white", icon: Leaf };
    }
    return null;
  };

  const groupedReplacements = replacements.reduce((acc, replacement) => {
    if (!acc[replacement.sizeMatch]) {
      acc[replacement.sizeMatch] = [];
    }
    acc[replacement.sizeMatch].push(replacement);
    return acc;
  }, {} as Record<string, DaikinReplacement[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-semibold text-primary">Daikin Replacements</h2>
        <Badge variant="outline" className="text-primary">
          {replacements.length} Options Available
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {(["smaller", "direct", "larger"] as const).map((sizeType) => {
          const matches = groupedReplacements[sizeType] || [];
          const config = sizeMatchConfig[sizeType];
          const IconComponent = config.icon;

          return (
            <div key={sizeType} className="space-y-4">
              <div className="flex items-center gap-2">
                <IconComponent className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-medium">{config.label}</h3>
                <Badge className={config.color} variant="secondary">
                  {matches.length} {matches.length === 1 ? 'Option' : 'Options'}
                </Badge>
              </div>

              {matches.length > 0 ? (
                <div className="space-y-4">
                  {matches.map((replacement) => {
                    const isSelected = selectedUnits.has(replacement.id);
                    const seerRating = getSEERRating(replacement.specifications);
                    const efficiencyBadge = getEfficiencyBadge(seerRating);
                    
                    return (
                      <Card 
                        key={replacement.id} 
                        className={`hover-elevate cursor-pointer border-primary/20 transition-colors ${
                          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                        }`}
                        onClick={() => onViewDetails(replacement)}
                        data-testid={`card-replacement-${replacement.sizeMatch}-${replacement.id}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              {onToggleSelection && (
                                <div 
                                  className="pt-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => onToggleSelection(replacement.id)}
                                    data-testid={`checkbox-select-${replacement.id}`}
                                  />
                                </div>
                              )}
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <CardTitle className="text-primary text-base">
                                    Daikin {replacement.modelNumber}
                                  </CardTitle>
                                  {seerRating && (
                                    <Badge 
                                      className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                      data-testid={`badge-seer-${replacement.id}`}
                                    >
                                      {seerRating} SEER
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {replacement.btuCapacity.toLocaleString()} BTU/hr • {replacement.voltage}V
                                </p>
                                {efficiencyBadge && (
                                  <div className="flex items-center gap-1 mt-1">
                                    {(() => {
                                      const IconComponent = efficiencyBadge.icon;
                                      return <IconComponent className="h-3 w-3" />;
                                    })()}
                                    <Badge 
                                      className={`text-xs ${efficiencyBadge.color}`}
                                      data-testid={`badge-efficiency-${replacement.id}`}
                                    >
                                      {efficiencyBadge.level} Efficiency
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <Badge className="bg-primary/10 text-primary">
                              {replacement.systemType}
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {Math.round(replacement.btuCapacity / 12000 * 10) / 10} Tons • {replacement.phases} Phase
                            </span>
                            
                            <div className="flex items-center gap-2">
                              {onExportSingle && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled={isExporting}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onExportSingle(replacement);
                                  }}
                                  data-testid={`button-export-${replacement.id}`}
                                  className="gap-1"
                                >
                                  <Download className="h-3 w-3" />
                                  Export
                                </Button>
                              )}
                              
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewDetails(replacement);
                                }}
                                data-testid={`button-view-details-${replacement.id}`}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      No {config.label.toLowerCase()} options available
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}