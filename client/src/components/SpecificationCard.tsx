import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Thermometer, Zap, Gauge, Fan, Edit2, Settings } from "lucide-react";
import { useState } from "react";
import EditableSpecificationForm from "./EditableSpecificationForm";
import { DaikinFamilyKeys } from "@shared/schema";

interface Specification {
  label: string;
  value: string;
  unit?: string;
}

interface SpecificationCardProps {
  title: string;
  modelNumber: string;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  btuCapacity: number;
  voltage: string;
  phases: string;
  specifications: Specification[];
  isOriginal?: boolean;
  // Enhanced editable features
  isEditable?: boolean;
  family?: DaikinFamilyKeys;
  onSpecificationUpdate?: (newModelNumber: string, specifications: any) => void;
  onSave?: (formData: any) => void;
}

export default function SpecificationCard({
  title,
  modelNumber,
  systemType,
  btuCapacity,
  voltage,
  phases,
  specifications,
  isOriginal = false,
  isEditable = false,
  family,
  onSpecificationUpdate,
  onSave
}: SpecificationCardProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const systemTypeColors = {
    "Heat Pump": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "Gas/Electric": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", 
    "Straight A/C": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  };

  const handleToggleEdit = () => {
    setIsEditMode(!isEditMode);
  };

  const handleSpecificationUpdate = (newModelNumber: string, specifications: any) => {
    onSpecificationUpdate?.(newModelNumber, specifications);
  };

  const handleSave = (formData: any) => {
    onSave?.(formData);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  // If editable and family is provided, and we're in edit mode, render the editable form
  if (isEditable && family && isEditMode) {
    return (
      <EditableSpecificationForm
        family={family}
        modelNumber={modelNumber}
        systemType={systemType}
        btuCapacity={btuCapacity}
        voltage={voltage}
        phases={phases}
        specifications={specifications}
        isOriginal={isOriginal}
        onModelUpdate={handleSpecificationUpdate}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  // Default read-only view
  return (
    <Card className={`w-full ${isOriginal ? 'border-muted-foreground/20' : 'border-primary/20'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className={`text-lg ${isOriginal ? 'text-muted-foreground' : 'text-primary'}`}>
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground font-mono">
              {modelNumber}
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
            {isEditable && family && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleToggleEdit}
                data-testid="button-edit-specifications"
                className="hover-elevate"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}