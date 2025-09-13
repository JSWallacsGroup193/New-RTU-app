import { useMutation, useQueryClient } from "@tanstack/react-query";
import { buildModel } from "@/lib/api";
import { BuildModelRequest, BuildModelResponse, DaikinFamilyKeys } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useModelBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: BuildModelRequest) => buildModel(params),
    onSuccess: (data: BuildModelResponse) => {
      if (!data.success && data.errors.length > 0) {
        toast({
          title: "Model Build Warning",
          description: data.errors.join(", "),
          variant: "destructive",
        });
      }
      
      if (data.warnings && data.warnings.length > 0) {
        toast({
          title: "Model Build Notice",
          description: data.warnings.join(", "),
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Model Build Failed",
        description: error.message || "Failed to build model with current specifications",
        variant: "destructive",
      });
    },
  });
}

export function useRealTimeModelBuilder() {
  const modelBuilder = useModelBuilder();
  
  const buildModelWithDebounce = (params: BuildModelRequest, callback?: (response: BuildModelResponse | null) => void) => {
    // Add a small delay to debounce rapid changes
    const timeoutId = setTimeout(() => {
      modelBuilder.mutate(params, {
        onSuccess: (data) => {
          callback?.(data);
        },
        onError: () => {
          callback?.(null);
        }
      });
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  };

  return {
    buildModel: buildModelWithDebounce,
    isBuilding: modelBuilder.isPending,
    error: modelBuilder.error,
    reset: modelBuilder.reset,
    lastResponse: modelBuilder.data,
  };
}