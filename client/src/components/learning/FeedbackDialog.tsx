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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  AlertCircle,
  Target 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ParsedModel } from "@shared/schema";

const feedbackFormSchema = z.object({
  feedbackType: z.enum(["perfect_match", "good_match", "poor_match", "wrong_match", "user_rejected"]),
  feedbackRating: z.number().min(1).max(5),
  feedbackComments: z.string().optional(),
  chosenMatchId: z.string().optional(),
});

type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalModelNumber: string;
  parsedSpecs: ParsedModel;
  suggestedMatches: any[];
  sessionId?: string;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  originalModelNumber,
  parsedSpecs,
  suggestedMatches,
  sessionId = "anonymous"
}: FeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string | undefined>();
  const { toast } = useToast();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      feedbackRating: 3,
    },
  });

  const watchedFeedbackType = form.watch("feedbackType");
  const watchedRating = form.watch("feedbackRating");

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/learning/feedback", {
        sessionId,
        originalModelNumber,
        parsedSpecs,
        suggestedMatches,
        chosenMatchId: selectedMatch || data.chosenMatchId,
        feedbackType: data.feedbackType,
        feedbackRating: data.feedbackRating,
        feedbackComments: data.feedbackComments,
      });

      toast({
        title: "Feedback Submitted",
        description: "Thank you! Your feedback helps improve our matching accuracy.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/learning/feedback"] });
      onOpenChange(false);
      form.reset();
      setSelectedMatch(undefined);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case "perfect_match":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "good_match":
        return <ThumbsUp className="h-4 w-4 text-blue-500" />;
      case "poor_match":
        return <ThumbsDown className="h-4 w-4 text-orange-500" />;
      case "wrong_match":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "user_rejected":
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-500";
    if (rating >= 3) return "text-blue-500";
    if (rating >= 2) return "text-orange-500";
    return "text-red-500";
  };

  const getRatingDescription = (rating: number) => {
    switch (rating) {
      case 1: return "Very Poor - Completely wrong";
      case 2: return "Poor - Mostly incorrect";
      case 3: return "Fair - Some good matches";
      case 4: return "Good - Mostly accurate";
      case 5: return "Excellent - Perfect matches";
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-feedback">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Rate Matching Accuracy
          </DialogTitle>
          <DialogDescription>
            Help us improve our matching system by rating the quality of the suggested Daikin replacements.
            Your feedback helps the system learn what constitutes good matches.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-feedback">
            {/* Original Parsing Summary */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Original Model Analysis</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Model:</span> {originalModelNumber}
                </div>
                <div>
                  <span className="font-medium">Manufacturer:</span> {parsedSpecs.manufacturer}
                </div>
                <div>
                  <span className="font-medium">System:</span> {parsedSpecs.systemType}
                </div>
                <div>
                  <span className="font-medium">Capacity:</span> {parsedSpecs.btuCapacity?.toLocaleString()} BTU
                </div>
              </div>
            </div>

            {/* Suggested Matches */}
            <div className="space-y-3">
              <h4 className="font-medium">Suggested Daikin Replacements</h4>
              <div className="grid gap-3 max-h-48 overflow-y-auto">
                {suggestedMatches.map((match, index) => (
                  <div
                    key={match.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover-elevate ${
                      selectedMatch === match.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    }`}
                    onClick={() => setSelectedMatch(match.id)}
                    data-testid={`match-option-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="selectedMatch"
                          value={match.id}
                          checked={selectedMatch === match.id}
                          onChange={() => setSelectedMatch(match.id)}
                          className="h-4 w-4"
                          data-testid={`radio-match-${index}`}
                        />
                        <div>
                          <div className="font-medium">{match.modelNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {match.btuCapacity.toLocaleString()} BTU • {match.systemType} • {match.voltage}
                          </div>
                        </div>
                      </div>
                      <Badge variant={match.sizeMatch === "exact" ? "default" : "secondary"}>
                        {match.sizeMatch === "exact" ? "Exact Match" : 
                         match.sizeMatch === "smaller" ? "Smaller" : "Larger"}
                      </Badge>
                    </div>
                  </div>
                ))}
                {suggestedMatches.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                    <p>No replacement matches were found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Feedback Type */}
            <FormField
              control={form.control}
              name="feedbackType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How would you rate the overall match quality?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 gap-3"
                      data-testid="radio-group-feedback-type"
                    >
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate">
                        <RadioGroupItem value="perfect_match" id="perfect_match" data-testid="radio-perfect-match" />
                        <Label htmlFor="perfect_match" className="flex items-center gap-2 flex-1 cursor-pointer">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="font-medium">Perfect Match</div>
                            <div className="text-sm text-muted-foreground">All suggestions are excellent replacements</div>
                          </div>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate">
                        <RadioGroupItem value="good_match" id="good_match" data-testid="radio-good-match" />
                        <Label htmlFor="good_match" className="flex items-center gap-2 flex-1 cursor-pointer">
                          <ThumbsUp className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium">Good Match</div>
                            <div className="text-sm text-muted-foreground">Most suggestions are suitable replacements</div>
                          </div>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate">
                        <RadioGroupItem value="poor_match" id="poor_match" data-testid="radio-poor-match" />
                        <Label htmlFor="poor_match" className="flex items-center gap-2 flex-1 cursor-pointer">
                          <ThumbsDown className="h-4 w-4 text-orange-500" />
                          <div>
                            <div className="font-medium">Poor Match</div>
                            <div className="text-sm text-muted-foreground">Some suggestions might work but aren't ideal</div>
                          </div>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate">
                        <RadioGroupItem value="wrong_match" id="wrong_match" data-testid="radio-wrong-match" />
                        <Label htmlFor="wrong_match" className="flex items-center gap-2 flex-1 cursor-pointer">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <div>
                            <div className="font-medium">Wrong Match</div>
                            <div className="text-sm text-muted-foreground">Suggestions are incorrect or incompatible</div>
                          </div>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate">
                        <RadioGroupItem value="user_rejected" id="user_rejected" data-testid="radio-user-rejected" />
                        <Label htmlFor="user_rejected" className="flex items-center gap-2 flex-1 cursor-pointer">
                          <AlertCircle className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">Not Using Suggestions</div>
                            <div className="text-sm text-muted-foreground">I'm not using any of these suggestions</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rating Scale */}
            {watchedFeedbackType && (
              <FormField
                control={form.control}
                name="feedbackRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Overall Rating
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            className="flex-1"
                            data-testid="slider-rating"
                          />
                          <div className="flex items-center gap-2 w-32">
                            <div className={`flex ${getRatingColor(field.value)}`}>
                              {Array.from({ length: field.value }).map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-current" />
                              ))}
                              {Array.from({ length: 5 - field.value }).map((_, i) => (
                                <Star key={i + field.value} className="h-4 w-4" />
                              ))}
                            </div>
                            <span className="font-medium">{field.value}/5</span>
                          </div>
                        </div>
                        <p className={`text-sm ${getRatingColor(field.value)}`}>
                          {getRatingDescription(field.value)}
                        </p>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Additional Comments */}
            <FormField
              control={form.control}
              name="feedbackComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Comments (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Share any specific thoughts about the matches, what worked well, or what could be improved..."
                      rows={3}
                      data-testid="textarea-feedback-comments"
                    />
                  </FormControl>
                  <FormDescription>
                    Help us understand what makes a good match for your specific needs.
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
                disabled={isSubmitting || !watchedFeedbackType}
                data-testid="button-submit-feedback"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Feedback
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