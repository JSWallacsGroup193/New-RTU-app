import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle, Brain } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ParsedModel } from "@shared/schema";

const correctionFormSchema = z.object({
  correctionType: z.enum(["parsing_error", "specification_mismatch", "incorrect_match", "missing_data"]),
  correctedModelNumber: z.string().optional(),
  correctedManufacturer: z.string().optional(),
  correctedSystemType: z.enum(["Heat Pump", "Gas/Electric", "Straight A/C"]).optional(),
  correctedVoltage: z.string().optional(),
  correctedPhases: z.string().optional(),
  correctedBtuCapacity: z.string().optional(),
  correctionReason: z.string().min(10, "Please provide a detailed explanation"),
  confidence: z.number().min(1).max(5).default(4),
});

type CorrectionFormData = z.infer<typeof correctionFormSchema>;

interface CorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalModelNumber: string;
  originalParsedData: ParsedModel;
  sessionId?: string;
}

export function CorrectionDialog({
  open,
  onOpenChange,
  originalModelNumber,
  originalParsedData,
  sessionId = "anonymous"
}: CorrectionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<CorrectionFormData>({
    resolver: zodResolver(correctionFormSchema),
    defaultValues: {
      correctedModelNumber: originalModelNumber,
      correctedManufacturer: originalParsedData.manufacturer,
      correctedSystemType: originalParsedData.systemType,
      correctedVoltage: originalParsedData.voltage,
      correctedPhases: originalParsedData.phases,
      correctedBtuCapacity: originalParsedData.btuCapacity?.toString(),
      confidence: 4,
    },
  });

  const watchedCorrectionType = form.watch("correctionType");

  const onSubmit = async (data: CorrectionFormData) => {
    setIsSubmitting(true);
    try {
      // Build corrected parsed data
      const correctedParsedData: ParsedModelData = {
        modelNumber: data.correctedModelNumber || originalModelNumber,
        manufacturer: data.correctedManufacturer || originalParsedData.manufacturer,
        systemType: data.correctedSystemType || originalParsedData.systemType,
        voltage: data.correctedVoltage || originalParsedData.voltage,
        phases: data.correctedPhases || originalParsedData.phases,
        btuCapacity: data.correctedBtuCapacity ? parseInt(data.correctedBtuCapacity) : originalParsedData.btuCapacity,
      };

      await apiRequest("POST", "/api/learning/corrections", {
        sessionId,
        originalModelNumber,
        originalParsedData,
        correctedParsedData,
        correctionType: data.correctionType,
        correctionReason: data.correctionReason,
      });

      toast({
        title: "Correction Submitted",
        description: "Thank you! Your correction helps improve the system's accuracy.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/learning/corrections"] });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Failed to submit correction:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your correction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCorrectionTypeIcon = (type: string) => {
    switch (type) {
      case "parsing_error":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "specification_mismatch":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "incorrect_match":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "missing_data":
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getCorrectionTypeDescription = (type: string) => {
    switch (type) {
      case "parsing_error":
        return "The system failed to correctly parse the model number";
      case "specification_mismatch":
        return "The parsed specifications don't match the actual unit";
      case "incorrect_match":
        return "The suggested replacement matches are incorrect";
      case "missing_data":
        return "Important information is missing from the parsing results";
      default:
        return "Select a correction type to continue";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-correction">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Improve System Accuracy
          </DialogTitle>
          <DialogDescription>
            Help us improve the HVAC model parsing system by correcting any errors you've noticed.
            Your feedback helps the system learn and become more accurate over time.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-correction">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Original Parsing Result</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Model:</span> {originalModelNumber}
                </div>
                <div>
                  <span className="font-medium">Manufacturer:</span> {originalParsedData.manufacturer}
                </div>
                <div>
                  <span className="font-medium">System Type:</span> {originalParsedData.systemType}
                </div>
                <div>
                  <span className="font-medium">Voltage:</span> {originalParsedData.voltage}
                </div>
                <div>
                  <span className="font-medium">Phases:</span> {originalParsedData.phases}
                </div>
                <div>
                  <span className="font-medium">BTU Capacity:</span> {originalParsedData.btuCapacity?.toLocaleString()}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="correctionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What type of correction is needed?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-correction-type">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select correction type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="parsing_error">
                        <div className="flex items-center gap-2">
                          {getCorrectionTypeIcon("parsing_error")}
                          Parsing Error
                        </div>
                      </SelectItem>
                      <SelectItem value="specification_mismatch">
                        <div className="flex items-center gap-2">
                          {getCorrectionTypeIcon("specification_mismatch")}
                          Specification Mismatch
                        </div>
                      </SelectItem>
                      <SelectItem value="incorrect_match">
                        <div className="flex items-center gap-2">
                          {getCorrectionTypeIcon("incorrect_match")}
                          Incorrect Match
                        </div>
                      </SelectItem>
                      <SelectItem value="missing_data">
                        <div className="flex items-center gap-2">
                          {getCorrectionTypeIcon("missing_data")}
                          Missing Data
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {watchedCorrectionType && (
                    <FormDescription className="flex items-start gap-2">
                      {getCorrectionTypeIcon(watchedCorrectionType)}
                      <span>{getCorrectionTypeDescription(watchedCorrectionType)}</span>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedCorrectionType && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Provide Correct Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="correctedModelNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correct Model Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-corrected-model" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="correctedManufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correct Manufacturer</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-corrected-manufacturer" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="correctedSystemType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correct System Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-corrected-system-type">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Heat Pump">Heat Pump</SelectItem>
                            <SelectItem value="Gas/Electric">Gas/Electric</SelectItem>
                            <SelectItem value="Straight A/C">Straight A/C</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="correctedVoltage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correct Voltage</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 208/230V" data-testid="input-corrected-voltage" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="correctedPhases"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correct Phases</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 1 Phase" data-testid="input-corrected-phases" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="correctedBtuCapacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correct BTU Capacity</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 24000" type="number" data-testid="input-corrected-capacity" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="correctionReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explanation of Correction</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Please explain why this correction is needed and provide any additional context..."
                      rows={3}
                      data-testid="textarea-correction-reason"
                    />
                  </FormControl>
                  <FormDescription>
                    A detailed explanation helps improve the system's learning accuracy.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confidence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How confident are you in this correction?</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        className="flex-1"
                        data-testid="slider-confidence"
                      />
                      <span className="font-medium w-16">
                        {field.value}/5 - {field.value <= 2 ? "Low" : field.value <= 3 ? "Medium" : field.value <= 4 ? "High" : "Very High"}
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Rate your confidence in the accuracy of this correction (1 = unsure, 5 = completely certain).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !watchedCorrectionType}
                data-testid="button-submit-correction"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Correction
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}