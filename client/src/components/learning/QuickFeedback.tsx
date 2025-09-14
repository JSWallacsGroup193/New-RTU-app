import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  MessageSquare, 
  CheckCircle,
  Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface QuickFeedbackProps {
  type: "parsing" | "matching";
  modelNumber: string;
  sessionId?: string;
  onDetailedFeedback?: () => void;
  className?: string;
}

export function QuickFeedback({ 
  type, 
  modelNumber, 
  sessionId = "anonymous",
  onDetailedFeedback,
  className = ""
}: QuickFeedbackProps) {
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleQuickFeedback = async (feedbackType: "positive" | "negative") => {
    setIsSubmitting(true);
    try {
      if (type === "parsing") {
        // Submit parsing feedback (simplified)
        await apiRequest("POST", "/api/learning/corrections", {
          sessionId,
          originalModelNumber: modelNumber,
          correctionType: feedbackType === "positive" ? "no_correction_needed" : "parsing_error",
          correctionReason: feedbackType === "positive" 
            ? "User confirmed parsing is correct" 
            : "User indicated parsing needs correction",
          confidence: feedbackType === "positive" ? 0.8 : 0.3
        });
      } else {
        // Submit matching feedback (simplified)
        await apiRequest("POST", "/api/learning/feedback", {
          sessionId,
          originalModelNumber: modelNumber,
          feedbackType: feedbackType === "positive" ? "good_match" : "poor_match",
          feedbackRating: feedbackType === "positive" ? 4 : 2,
          feedbackComments: feedbackType === "positive" 
            ? "User indicated good matches via quick feedback" 
            : "User indicated poor matches via quick feedback"
        });
      }

      setFeedback(feedbackType);
      queryClient.invalidateQueries({ queryKey: ["/api/learning"] });
      
      toast({
        title: "Thank you!",
        description: `Your ${feedbackType} feedback helps improve the system.`,
      });

    } catch (error) {
      console.error("Failed to submit quick feedback:", error);
      toast({
        title: "Feedback Error",
        description: "Could not submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (feedback) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span className="text-xs">
            {feedback === "positive" ? "Helpful" : "Needs work"}
          </span>
        </Badge>
        <span className="text-xs text-muted-foreground">Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="quick-feedback">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Brain className="h-3 w-3" />
          Was this {type === "parsing" ? "parsing" : "matching"} helpful?
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => handleQuickFeedback("positive")}
              disabled={isSubmitting}
              data-testid="button-thumbs-up"
            >
              <ThumbsUp className="h-3 w-3" />
              <span className="sr-only">Mark as helpful</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mark as helpful</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => handleQuickFeedback("negative")}
              disabled={isSubmitting}
              data-testid="button-thumbs-down"
            >
              <ThumbsDown className="h-3 w-3" />
              <span className="sr-only">Needs improvement</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Needs improvement</p>
          </TooltipContent>
        </Tooltip>

        {onDetailedFeedback && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={onDetailedFeedback}
                data-testid="button-detailed-feedback"
              >
                <MessageSquare className="h-3 w-3" />
                <span className="sr-only">Provide detailed feedback</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Provide detailed feedback</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}