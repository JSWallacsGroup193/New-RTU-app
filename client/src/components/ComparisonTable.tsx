import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  TrendingUp, 
  Leaf, 
  Volume2, 
  Zap, 
  Download,
  FileText,
  DollarSign,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Equal
} from "lucide-react";
import { type OriginalUnit, type DaikinReplacement } from "@shared/schema";

interface ComparisonTableProps {
  originalUnit: OriginalUnit;
  replacementUnit: DaikinReplacement;
  onExportPDF?: () => void;
  showExportButton?: boolean;
  compact?: boolean;
}

interface ComparisonRow {
  category: string;
  label: string;
  originalValue: string | number;
  replacementValue: string | number;
  improvement: {
    type: 'better' | 'same' | 'worse' | 'neutral';
    text: string;
    icon?: React.ReactNode;
  };
  description?: string;
}

export default function ComparisonTable({
  originalUnit,
  replacementUnit,
  onExportPDF,
  showExportButton = true,
  compact = false
}: ComparisonTableProps) {
  
  // Helper function to get specification value
  const getSpecValue = (specs: Array<{label: string, value: string, unit?: string}>, label: string): string => {
    const spec = specs.find(s => s.label.toLowerCase().includes(label.toLowerCase()));
    return spec ? `${spec.value}${spec.unit || ''}` : 'N/A';
  };

  // Helper function to get numeric value from specifications
  const getNumericSpecValue = (specs: Array<{label: string, value: string, unit?: string}>, label: string): number | null => {
    const spec = specs.find(s => s.label.toLowerCase().includes(label.toLowerCase()));
    if (!spec) return null;
    const numValue = parseFloat(spec.value);
    return isNaN(numValue) ? null : numValue;
  };

  // Format BTU capacity
  const formatBTU = (btu: number): string => {
    return `${(btu / 1000).toFixed(0)}K BTU/hr`;
  };

  // Calculate efficiency improvement
  const calculateEfficiencyImprovement = (original: string | number | null, replacement: string | number | null) => {
    if (!original || !replacement) return { type: 'neutral' as const, text: '—' };
    
    const origNum = typeof original === 'string' ? parseFloat(original) : original;
    const replNum = typeof replacement === 'string' ? parseFloat(replacement) : replacement;
    
    if (isNaN(origNum) || isNaN(replNum)) return { type: 'neutral' as const, text: '—' };
    
    const improvement = ((replNum / origNum - 1) * 100);
    
    if (improvement > 5) {
      return { 
        type: 'better' as const, 
        text: `+${improvement.toFixed(1)}%`,
        icon: <ArrowUp className="h-3 w-3 text-green-600" />
      };
    } else if (improvement > 0) {
      return { 
        type: 'better' as const, 
        text: `+${improvement.toFixed(1)}%`,
        icon: <TrendingUp className="h-3 w-3 text-green-600" />
      };
    } else if (improvement === 0) {
      return { 
        type: 'same' as const, 
        text: 'Same',
        icon: <Equal className="h-3 w-3 text-gray-500" />
      };
    } else {
      return { 
        type: 'worse' as const, 
        text: `${improvement.toFixed(1)}%`,
        icon: <ArrowDown className="h-3 w-3 text-orange-500" />
      };
    }
  };

  // Get size match indicator
  const getSizeMatchIndicator = (sizeMatch: string) => {
    switch (sizeMatch) {
      case 'direct':
        return { 
          type: 'better' as const, 
          text: 'Perfect Match',
          icon: <CheckCircle2 className="h-3 w-3 text-green-600" />
        };
      case 'larger':
        return { 
          type: 'better' as const, 
          text: 'Oversized (More Capacity)',
          icon: <ArrowUp className="h-3 w-3 text-blue-600" />
        };
      case 'smaller':
        return { 
          type: 'worse' as const, 
          text: 'Undersized',
          icon: <AlertTriangle className="h-3 w-3 text-orange-500" />
        };
      default:
        return { type: 'neutral' as const, text: '—' };
    }
  };

  // Get match indicator for text values
  const getMatchIndicator = (original: string, replacement: string, label: string = '') => {
    if (original === replacement) {
      return { 
        type: 'same' as const, 
        text: 'Match',
        icon: <CheckCircle2 className="h-3 w-3 text-green-600" />
      };
    }
    
    // Special cases for system benefits
    if (label.toLowerCase().includes('refrigerant') && replacement.includes('R-32')) {
      return { 
        type: 'better' as const, 
        text: 'Eco-Friendly R-32',
        icon: <Leaf className="h-3 w-3 text-green-600" />
      };
    }
    
    if (label.toLowerCase().includes('drive') && replacement.includes('Variable')) {
      return { 
        type: 'better' as const, 
        text: 'Advanced Control',
        icon: <Zap className="h-3 w-3 text-blue-600" />
      };
    }
    
    return { 
      type: 'neutral' as const, 
      text: `${original} → ${replacement}`
    };
  };

  // Build comparison data
  const comparisonData: ComparisonRow[] = [
    {
      category: 'Basic',
      label: 'Model Number',
      originalValue: originalUnit.modelNumber,
      replacementValue: replacementUnit.modelNumber,
      improvement: { type: 'neutral', text: 'New Model' }
    },
    {
      category: 'Basic',
      label: 'Manufacturer',
      originalValue: originalUnit.manufacturer,
      replacementValue: 'Daikin',
      improvement: { 
        type: 'better', 
        text: 'R-32 Technology',
        icon: <Award className="h-3 w-3 text-blue-600" />
      }
    },
    {
      category: 'Basic',
      label: 'System Type',
      originalValue: originalUnit.systemType,
      replacementValue: replacementUnit.systemType,
      improvement: getMatchIndicator(originalUnit.systemType, replacementUnit.systemType)
    },
    {
      category: 'Capacity',
      label: 'BTU Capacity',
      originalValue: formatBTU(originalUnit.btuCapacity),
      replacementValue: formatBTU(replacementUnit.btuCapacity),
      improvement: getSizeMatchIndicator(replacementUnit.sizeMatch),
      description: 'Cooling/heating capacity comparison'
    },
    {
      category: 'Electrical',
      label: 'Voltage',
      originalValue: originalUnit.voltage,
      replacementValue: replacementUnit.voltage,
      improvement: getMatchIndicator(originalUnit.voltage, replacementUnit.voltage)
    },
    {
      category: 'Electrical',
      label: 'Phases',
      originalValue: originalUnit.phases,
      replacementValue: replacementUnit.phases,
      improvement: getMatchIndicator(originalUnit.phases, replacementUnit.phases)
    },
    {
      category: 'Efficiency',
      label: 'SEER2 Rating',
      originalValue: getSpecValue(originalUnit.specifications, 'SEER2 Rating') || getSpecValue(originalUnit.specifications, 'SEER') || 'N/A',
      replacementValue: replacementUnit.seerRating || getSpecValue(replacementUnit.specifications, 'SEER') || 'N/A',
      improvement: calculateEfficiencyImprovement(
        getNumericSpecValue(originalUnit.specifications, 'SEER2 Rating') || getNumericSpecValue(originalUnit.specifications, 'SEER'),
        replacementUnit.seerRating || getNumericSpecValue(replacementUnit.specifications, 'SEER')
      ),
      description: 'Seasonal Energy Efficiency Ratio - higher is better'
    },
    {
      category: 'Technology',
      label: 'Refrigerant',
      originalValue: getSpecValue(originalUnit.specifications, 'Refrigerant') || 'R-410A',
      replacementValue: replacementUnit.refrigerant || 'R-32',
      improvement: getMatchIndicator(
        getSpecValue(originalUnit.specifications, 'Refrigerant') || 'R-410A',
        replacementUnit.refrigerant || 'R-32',
        'refrigerant'
      ),
      description: 'R-32 has 68% lower Global Warming Potential than R-410A'
    },
    {
      category: 'Technology',
      label: 'Drive Type',
      originalValue: getSpecValue(originalUnit.specifications, 'Drive Type') || 'Fixed Speed',
      replacementValue: replacementUnit.driveType || 'Variable Speed',
      improvement: getMatchIndicator(
        getSpecValue(originalUnit.specifications, 'Drive Type') || 'Fixed Speed',
        replacementUnit.driveType || 'Variable Speed',
        'drive'
      ),
      description: 'Variable speed provides better efficiency and comfort control'
    }
  ];

  // Add conditional rows
  if (replacementUnit.eerRating || getSpecValue(originalUnit.specifications, 'EER')) {
    comparisonData.push({
      category: 'Efficiency',
      label: 'EER Rating',
      originalValue: getSpecValue(originalUnit.specifications, 'EER') || 'N/A',
      replacementValue: replacementUnit.eerRating || 'N/A',
      improvement: calculateEfficiencyImprovement(
        getNumericSpecValue(originalUnit.specifications, 'EER'),
        replacementUnit.eerRating ?? null
      ),
      description: 'Energy Efficiency Ratio at peak conditions'
    });
  }

  if (replacementUnit.hspfRating || getSpecValue(originalUnit.specifications, 'HSPF')) {
    comparisonData.push({
      category: 'Efficiency',
      label: 'HSPF Rating',
      originalValue: getSpecValue(originalUnit.specifications, 'HSPF') || 'N/A',
      replacementValue: replacementUnit.hspfRating || 'N/A',
      improvement: calculateEfficiencyImprovement(
        getNumericSpecValue(originalUnit.specifications, 'HSPF'),
        replacementUnit.hspfRating ?? null
      ),
      description: 'Heating Seasonal Performance Factor for heat pumps'
    });
  }

  if (replacementUnit.soundLevel || getSpecValue(originalUnit.specifications, 'Sound Level')) {
    comparisonData.push({
      category: 'Performance',
      label: 'Sound Level',
      originalValue: getSpecValue(originalUnit.specifications, 'Sound Level') || 'N/A',
      replacementValue: replacementUnit.soundLevel ? `${replacementUnit.soundLevel} dB` : 'N/A',
      improvement: { 
        type: 'better', 
        text: 'Quieter Operation',
        icon: <Volume2 className="h-3 w-3 text-green-600" />
      },
      description: 'Lower dB rating means quieter operation'
    });
  }

  // Calculate estimated annual savings
  const originalSeer = getNumericSpecValue(originalUnit.specifications, 'SEER') || 
                      getNumericSpecValue(originalUnit.specifications, 'SEER Rating') || 12;
  const replacementSeer = replacementUnit.seerRating || 16;
  const annualSavings = calculateAnnualSavings(originalSeer, replacementSeer, replacementUnit.btuCapacity);

  // Calculate annual energy savings
  function calculateAnnualSavings(originalSeer: number, newSeer: number, capacity: number): number {
    const annualKwh = capacity * 2000 / 1000; // Assume 2000 hours of operation
    const originalConsumption = annualKwh / originalSeer;
    const newConsumption = annualKwh / newSeer;
    const kwhSaved = originalConsumption - newConsumption;
    return kwhSaved * 0.12; // Assume $0.12 per kWh
  }

  // Group data by category
  const groupedData = comparisonData.reduce((acc, row) => {
    if (!acc[row.category]) {
      acc[row.category] = [];
    }
    acc[row.category].push(row);
    return acc;
  }, {} as Record<string, ComparisonRow[]>);

  return (
    <Card className="w-full" data-testid="comparison-table">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Equipment Comparison Analysis
          </CardTitle>
          {showExportButton && (
            <Button
              onClick={onExportPDF}
              variant="outline"
              size="sm"
              className="gap-2"
              data-testid="button-export-comparison"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">Efficiency Gain</span>
            </div>
            <div className="text-lg font-bold text-green-600">
              {originalSeer && replacementSeer ? 
                `+${((replacementSeer / originalSeer - 1) * 100).toFixed(1)}%` : 
                'Improved'
              }
            </div>
            <div className="text-xs text-muted-foreground">SEER Rating</div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Annual Savings</span>
            </div>
            <div className="text-lg font-bold text-blue-600">
              ${annualSavings.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">Estimated per year</div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Leaf className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">Environmental</span>
            </div>
            <div className="text-lg font-bold text-green-600">68%</div>
            <div className="text-xs text-muted-foreground">Lower GWP with R-32</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {Object.entries(groupedData).map(([category, rows], categoryIndex) => (
          <div key={category}>
            {categoryIndex > 0 && <Separator className="mb-4" />}
            
            <div className="mb-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {category} Specifications
              </h4>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Specification</TableHead>
                  <TableHead className="text-center">Original Unit</TableHead>
                  <TableHead className="text-center">Daikin Replacement</TableHead>
                  <TableHead className="text-center w-[150px]">Improvement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={`${category}-${index}`} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{row.label}</div>
                        {row.description && !compact && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {row.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      <Badge variant="secondary" className="text-xs">
                        {row.originalValue}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      <Badge variant="outline" className="text-xs font-semibold">
                        {row.replacementValue}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`flex items-center justify-center gap-1 text-xs font-medium ${
                        row.improvement.type === 'better' ? 'text-green-600' :
                        row.improvement.type === 'worse' ? 'text-orange-500' :
                        row.improvement.type === 'same' ? 'text-gray-600' :
                        'text-muted-foreground'
                      }`}>
                        {row.improvement.icon}
                        <span>{row.improvement.text}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}

        {/* Environmental Benefits Callout */}
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Leaf className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                Environmental Benefits of R-32 Refrigerant
              </h4>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>• 68% lower Global Warming Potential (GWP) than R-410A</li>
                <li>• Improved energy efficiency reduces carbon footprint</li>
                <li>• Better heat transfer properties for superior performance</li>
                <li>• Complies with future environmental regulations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Professional Notes */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Professional Installation Notes
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Professional installation by certified HVAC technician required</li>
                <li>• Existing R-410A equipment requires complete refrigerant recovery</li>
                <li>• Line sets and components must be compatible with R-32 refrigerant</li>
                <li>• Local codes and utility incentives may apply</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}