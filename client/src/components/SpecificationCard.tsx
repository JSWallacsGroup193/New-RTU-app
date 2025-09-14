import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Thermometer, Zap, Gauge, Fan, Edit2, Settings, Wrench, ChevronDown, ChevronUp, AlertTriangle, MessageSquare } from "lucide-react";
import { useState } from "react";
import EditableSpecificationForm from "./EditableSpecificationForm";
import AccessoryManagement from "./AccessoryManagement";
import { CorrectionDialog, FeedbackDialog, QuickFeedback } from "@/components/learning";
import { DaikinFamilyKeys, type ParsedModel } from "@shared/schema";

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
  // Accessory management
  showAccessories?: boolean;
  selectedFactoryOptions?: string[];
  selectedFieldAccessories?: string[];
  onFactoryOptionsChange?: (selectedOptions: string[]) => void;
  onFieldAccessoriesChange?: (selectedAccessories: string[]) => void;
  // Learning system integration
  enableLearning?: boolean;
  sessionId?: string;
  originalModelNumber?: string;
  originalParsedData?: ParsedModelData;
  suggestedMatches?: ModelSpecification[];
  showLearningFeedback?: boolean;
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
  onSave,
  showAccessories = false,
  selectedFactoryOptions = [],
  selectedFieldAccessories = [],
  onFactoryOptionsChange,
  onFieldAccessoriesChange,
  // Learning system props
  enableLearning = false,
  sessionId = "anonymous",
  originalModelNumber,
  originalParsedData,
  suggestedMatches = [],
  showLearningFeedback = false
}: SpecificationCardProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAccessoriesSection, setShowAccessoriesSection] = useState(false);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
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

        {/* Accessory Management Section */}
        {showAccessories && family && (
          <>
            <Separator />
            <Collapsible open={showAccessoriesSection} onOpenChange={setShowAccessoriesSection}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-2 h-auto hover-elevate"
                  data-testid="button-toggle-accessories"
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Accessory Options</span>
                    {(selectedFactoryOptions.length > 0 || selectedFieldAccessories.length > 0) && (
                      <Badge variant="default" className="text-xs">
                        {selectedFactoryOptions.length + selectedFieldAccessories.length} selected
                      </Badge>
                    )}
                  </div>
                  {showAccessoriesSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-4">
                <AccessoryManagement
                  family={family}
                  modelNumber={modelNumber}
                  systemType={systemType}
                  tonnage={Math.round(btuCapacity / 12000 * 10) / 10}
                  selectedFactoryOptions={selectedFactoryOptions}
                  selectedFieldAccessories={selectedFieldAccessories}
                  onFactoryOptionsChange={onFactoryOptionsChange}
                  onFieldAccessoriesChange={onFieldAccessoriesChange}
                  showPricing={true}
                  mode="selection"
                />
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Learning System Feedback Section */}
        {enableLearning && showLearningFeedback && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <QuickFeedback
                  type={isOriginal ? "parsing" : "matching"}
                  modelNumber={originalModelNumber || modelNumber}
                  sessionId={sessionId}
                  onDetailedFeedback={() => {
                    if (isOriginal && originalParsedData) {
                      setShowCorrectionDialog(true);
                    } else if (!isOriginal && suggestedMatches.length > 0) {
                      setShowFeedbackDialog(true);
                    }
                  }}
                />
                
                {(isOriginal && originalParsedData) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCorrectionDialog(true)}
                    data-testid="button-report-parsing-error"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Error
                  </Button>
                )}
                
                {(!isOriginal && suggestedMatches.length > 0) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowFeedbackDialog(true)}
                    data-testid="button-rate-match"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Rate Match
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Learning System Dialogs */}
      {enableLearning && originalParsedData && (
        <CorrectionDialog
          open={showCorrectionDialog}
          onOpenChange={setShowCorrectionDialog}
          originalModelNumber={originalModelNumber || modelNumber}
          originalParsedData={originalParsedData}
          sessionId={sessionId}
        />
      )}

      {enableLearning && suggestedMatches.length > 0 && originalParsedData && (
        <FeedbackDialog
          open={showFeedbackDialog}
          onOpenChange={setShowFeedbackDialog}
          originalModelNumber={originalModelNumber || modelNumber}
          parsedSpecs={originalParsedData}
          suggestedMatches={suggestedMatches}
          sessionId={sessionId}
        />
      )}
    </Card>
  );
}