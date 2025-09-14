import { useMutation, useQueryClient } from "@tanstack/react-query";
import { buildModel } from "@/lib/api";
import { BuildModelRequest, BuildModelResponse, DaikinFamilyKeys } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback } from "react";

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
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const buildModelWithDebounce = useCallback((params: BuildModelRequest, callback?: (response: BuildModelResponse | null) => void) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setIsDebouncing(true);
    
    // Add a small delay to debounce rapid changes
    timeoutRef.current = setTimeout(() => {
      setIsDebouncing(false);
      modelBuilder.mutate(params, {
        onSuccess: (data) => {
          callback?.(data);
        },
        onError: () => {
          callback?.(null);
        }
      });
    }, 300); // 300ms debounce

    // Return cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setIsDebouncing(false);
      }
    };
  }, [modelBuilder]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    buildModel: buildModelWithDebounce,
    isBuilding: modelBuilder.isPending || isDebouncing,
    error: modelBuilder.error,
    reset: modelBuilder.reset,
    lastResponse: modelBuilder.data,
  };
}