import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wrench, 
  Zap, 
  Settings, 
  Snowflake, 
  Filter, 
  Thermometer,
  ChevronDown,
  ChevronUp,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { useState, useEffect } from "react";
import { DaikinFamilyKeys } from "@shared/schema";

// Factory-installed option interface
interface FactoryInstalledOption {
  category: string;
  code: string;
  description: string;
  priceAdder?: number;
}

// Field accessory interface  
interface FieldAccessory {
  category: string;
  code: string;
  description: string;
  compatible?: string[];
}

interface AccessoryManagementProps {
  family: DaikinFamilyKeys;
  modelNumber: string;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  tonnage: string | number;
  selectedFactoryOptions?: string[];
  selectedFieldAccessories?: string[];
  onFactoryOptionsChange?: (selectedOptions: string[]) => void;
  onFieldAccessoriesChange?: (selectedAccessories: string[]) => void;
  showPricing?: boolean;
  isExpanded?: boolean;
  mode?: "selection" | "display";
}

export default function AccessoryManagement({
  family,
  modelNumber,
  systemType,
  tonnage,
  selectedFactoryOptions = [],
  selectedFieldAccessories = [],
  onFactoryOptionsChange,
  onFieldAccessoriesChange,
  showPricing = true,
  isExpanded = false,
  mode = "selection"
}: AccessoryManagementProps) {
  const [factoryOptions, setFactoryOptions] = useState<FactoryInstalledOption[]>([]);
  const [fieldAccessories, setFieldAccessories] = useState<FieldAccessory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Category icons mapping
  const categoryIcons = {
    Electrical: Zap,
    Controls: Settings,
    Refrigerant: Snowflake,
    Filters: Filter,
    Sensors: Thermometer,
    Dampers: Wrench,
    default: Wrench
  };

  // Fetch accessory data based on family
  useEffect(() => {
    const fetchAccessories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/family-options', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            family,
            manufacturer: 'Daikin'
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch accessory data');
        }

        const data = await response.json();
        
        // Extract factory options and field accessories from response
        const allFactoryOptions = [
          ...(data.options?.factory_accessories?.electrical || []),
          ...(data.options?.factory_accessories?.controls || []),
          ...(data.options?.factory_accessories?.refrigerant || [])
        ];
        
        const allFieldAccessories = data.options?.field_accessories || [];
        
        setFactoryOptions(allFactoryOptions);
        setFieldAccessories(allFieldAccessories);
        
        // Set default expanded sections
        setExpandedSections({
          'factory-electrical': true,
          'field-controls': true
        });
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccessories();
  }, [family]);

  // Group accessories by category
  const groupedFactoryOptions = factoryOptions.reduce((acc, option) => {
    if (!acc[option.category]) acc[option.category] = [];
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, FactoryInstalledOption[]>);

  const groupedFieldAccessories = fieldAccessories.reduce((acc, accessory) => {
    if (!acc[accessory.category]) acc[accessory.category] = [];
    acc[accessory.category].push(accessory);
    return acc;
  }, {} as Record<string, FieldAccessory[]>);

  // Calculate total pricing for selected factory options
  const totalFactoryPrice = selectedFactoryOptions.reduce((total, code) => {
    const option = factoryOptions.find(opt => opt.code === code);
    return total + (option?.priceAdder || 0);
  }, 0);

  // Handle factory option selection
  const handleFactoryOptionChange = (code: string, checked: boolean) => {
    const updatedOptions = checked 
      ? [...selectedFactoryOptions, code]
      : selectedFactoryOptions.filter(c => c !== code);
    
    onFactoryOptionsChange?.(updatedOptions);
  };

  // Handle field accessory selection
  const handleFieldAccessoryChange = (code: string, checked: boolean) => {
    const updatedAccessories = checked
      ? [...selectedFieldAccessories, code]
      : selectedFieldAccessories.filter(c => c !== code);
    
    onFieldAccessoriesChange?.(updatedAccessories);
  };

  // Check if field accessory is compatible with current model
  const isAccessoryCompatible = (accessory: FieldAccessory) => {
    if (!accessory.compatible) return true;
    if (accessory.compatible.includes("all")) return true;
    return accessory.compatible.includes(family) || 
           accessory.compatible.some(comp => modelNumber.includes(comp));
  };

  // Toggle section expansion
  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Render accessory checkbox item
  const renderAccessoryItem = (
    type: 'factory' | 'field',
    item: FactoryInstalledOption | FieldAccessory,
    isSelected: boolean,
    isCompatible: boolean = true
  ) => {
    const isFactory = type === 'factory';
    const factoryItem = isFactory ? item as FactoryInstalledOption : null;
    const fieldItem = !isFactory ? item as FieldAccessory : null;
    
    return (
      <div 
        key={item.code} 
        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
          isSelected ? 'bg-primary/10 border-primary/30' : 'bg-card hover-elevate border-border'
        } ${!isCompatible ? 'opacity-60' : ''}`}
      >
        <Checkbox
          checked={isSelected}
          disabled={!isCompatible || mode === 'display'}
          onCheckedChange={(checked) => {
            if (isFactory) {
              handleFactoryOptionChange(item.code, Boolean(checked));
            } else {
              handleFieldAccessoryChange(item.code, Boolean(checked));
            }
          }}
          data-testid={`checkbox-${type}-${item.code}`}
          className="mt-1"
        />
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{item.description}</span>
            <Badge variant="outline" className="text-xs">
              {item.code}
            </Badge>
            {!isCompatible && (
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Limited
              </Badge>
            )}
          </div>
          
          {isFactory && factoryItem?.priceAdder && showPricing && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              +${factoryItem.priceAdder}
            </div>
          )}
          
          {!isFactory && fieldItem?.compatible && (
            <div className="text-xs text-muted-foreground">
              Compatible: {fieldItem.compatible.includes("all") 
                ? "All models" 
                : fieldItem.compatible.join(", ")}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render category section
  const renderCategorySection = (
    type: 'factory' | 'field',
    category: string,
    items: (FactoryInstalledOption | FieldAccessory)[]
  ) => {
    const sectionKey = `${type}-${category.toLowerCase()}`;
    const isExpanded = expandedSections[sectionKey];
    const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || categoryIcons.default;
    
    const selectedCount = items.filter(item => {
      const isSelected = type === 'factory' 
        ? selectedFactoryOptions.includes(item.code)
        : selectedFieldAccessories.includes(item.code);
      return isSelected;
    }).length;

    return (
      <div key={sectionKey} className="space-y-2">
        <Collapsible open={isExpanded} onOpenChange={() => toggleSection(sectionKey)}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-2 h-auto hover-elevate"
              data-testid={`button-toggle-${sectionKey}`}
            >
              <div className="flex items-center gap-2">
                <IconComponent className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{category}</span>
                <Badge variant="secondary" className="text-xs">
                  {items.length}
                </Badge>
                {selectedCount > 0 && (
                  <Badge variant="default" className="text-xs">
                    {selectedCount} selected
                  </Badge>
                )}
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2">
            {items.map(item => {
              const isSelected = type === 'factory' 
                ? selectedFactoryOptions.includes(item.code)
                : selectedFieldAccessories.includes(item.code);
              
              const isCompatible = type === 'field' 
                ? isAccessoryCompatible(item as FieldAccessory)
                : true;
              
              return renderAccessoryItem(type, item, isSelected, isCompatible);
            })}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Accessory Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Accessory Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load accessory options: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="card-accessory-management">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Accessory Options
          </div>
          {showPricing && totalFactoryPrice > 0 && (
            <Badge variant="default" className="bg-green-600 text-white">
              <DollarSign className="h-3 w-3 mr-1" />
              +${totalFactoryPrice}
            </Badge>
          )}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Available accessories for {family} {modelNumber} ({systemType})
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="factory" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="factory" 
              data-testid="tab-factory-options"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Factory Installed
              {selectedFactoryOptions.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedFactoryOptions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="field" 
              data-testid="tab-field-accessories"
              className="flex items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              Field Installed
              {selectedFieldAccessories.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedFieldAccessories.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="factory" className="space-y-4">
            {Object.keys(groupedFactoryOptions).length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No factory-installed options available for this model.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  Factory-installed options are configured during manufacturing and cannot be field-installed.
                </div>
                {Object.entries(groupedFactoryOptions).map(([category, options]) =>
                  renderCategorySection('factory', category, options)
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="field" className="space-y-4">
            {Object.keys(groupedFieldAccessories).length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No field accessories available for this model.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  Field accessories can be installed during installation or as upgrades.
                </div>
                {Object.entries(groupedFieldAccessories).map(([category, accessories]) =>
                  renderCategorySection('field', category, accessories)
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}