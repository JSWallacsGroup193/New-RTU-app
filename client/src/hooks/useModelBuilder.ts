import { useMutation, useQueryClient } from "@tanstack/react-query";
import { buildModel } from "@/lib/api";
import { BuildModelRequest, BuildModelResponse, DaikinFamilyKeys } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// Enhanced cache with timestamp tracking and intelligent eviction for real-time updates
interface CacheEntry {
  data: BuildModelResponse;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  requestHash: string;
}

class AdvancedModelBuilderCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes for better performance
  private readonly CACHE_SIZE_LIMIT = 500; // Large cache for real-time updates
  private readonly MAX_ACCESS_COUNT = 1000;

  generateKey(request: BuildModelRequest): string {
    return JSON.stringify({
      family: request.family,
      tons: request.tons,
      voltage: request.voltage,
      fan_drive: request.fan_drive,
      controls: request.controls,
      refrig_sys: request.refrig_sys,
      gas_btu_numeric: request.gas_btu_numeric,
      electric_kw: request.electric_kw,
      heat_exchanger: request.heat_exchanger
    });
  }

  set(key: string, data: BuildModelResponse, request: BuildModelRequest): void {
    const now = Date.now();
    
    if (this.cache.size >= this.CACHE_SIZE_LIMIT) {
      this.evictStaleEntries();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      requestHash: this.generateKey(request)
    });
  }

  get(key: string): BuildModelResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    if (now - entry.timestamp > this.CACHE_EXPIRY) {
      this.cache.delete(key);
      return null;
    }

    entry.accessCount = Math.min(entry.accessCount + 1, this.MAX_ACCESS_COUNT);
    entry.lastAccessed = now;
    
    return entry.data;
  }

  private evictStaleEntries(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries first
    const activeEntries = entries.filter(([key, entry]) => {
      if (now - entry.timestamp > this.CACHE_EXPIRY) {
        this.cache.delete(key);
        return false;
      }
      return true;
    });

    // Remove LRU entries if still over limit
    if (activeEntries.length >= this.CACHE_SIZE_LIMIT) {
      const toRemove = activeEntries
        .sort((a, b) => {
          // Sort by access frequency and recency
          const scoreA = a[1].accessCount * 0.7 + (now - a[1].lastAccessed) * 0.3;
          const scoreB = b[1].accessCount * 0.7 + (now - b[1].lastAccessed) * 0.3;
          return scoreA - scoreB;
        })
        .slice(0, Math.floor(this.CACHE_SIZE_LIMIT * 0.25));

      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getHitRate(): number {
    if (this.cache.size === 0) return 0;
    const totalAccesses = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);
    return totalAccesses / this.cache.size;
  }

  size(): number {
    return this.cache.size;
  }
}

const advancedCache = new AdvancedModelBuilderCache();

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
  const queryClient = useQueryClient();
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cacheHitRate, setCacheHitRate] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<string>("");
  const requestCountRef = useRef(0);
  
  // Advanced debounced build function with intelligent caching and react-query integration
  const buildModelWithAdvancedDebounce = useCallback((
    params: BuildModelRequest, 
    callback?: (response: BuildModelResponse | null, fromCache?: boolean) => void,
    options?: { 
      debounceMs?: number;
      forceRefresh?: boolean;
      priority?: 'high' | 'normal' | 'low';
    }
  ) => {
    const { debounceMs = 300, forceRefresh = false, priority = 'normal' } = options || {};
    
    // Generate cache key
    const cacheKey = advancedCache.generateKey(params);
    const queryKey = ['buildModel', cacheKey];
    
    // Check both our advanced cache AND react-query cache
    if (!forceRefresh) {
      // First check our advanced cache
      const cachedResult = advancedCache.get(cacheKey);
      if (cachedResult) {
        // Also set in react-query cache for consistency
        queryClient.setQueryData(queryKey, cachedResult);
        callback?.(cachedResult, true);
        setCacheHitRate(advancedCache.getHitRate());
        return () => {}; // No cleanup needed for cache hits
      }
      
      // Check react-query cache as fallback
      const reactQueryCachedData = queryClient.getQueryData<BuildModelResponse>(queryKey);
      if (reactQueryCachedData) {
        // Also set in our advanced cache for consistency
        advancedCache.set(cacheKey, reactQueryCachedData, params);
        callback?.(reactQueryCachedData, true);
        setCacheHitRate(advancedCache.getHitRate());
        return () => {}; // No cleanup needed for cache hits
      }
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setIsDebouncing(true);
    setIsLoading(true);
    requestCountRef.current += 1;
    lastRequestRef.current = cacheKey;
    
    // Dynamic debounce based on priority and request frequency
    const dynamicDebounce = priority === 'high' ? Math.min(debounceMs, 150) :
                           priority === 'low' ? debounceMs * 1.5 :
                           debounceMs;
    
    timeoutRef.current = setTimeout(() => {
      // Check if this is still the latest request
      if (lastRequestRef.current === cacheKey) {
        setIsDebouncing(false);
        
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        
        modelBuilder.mutate(params, {
          onSuccess: (data) => {
            // Cache in both caches
            advancedCache.set(cacheKey, data, params);
            queryClient.setQueryData(queryKey, data);
            setCacheHitRate(advancedCache.getHitRate());
            setIsLoading(false);
            callback?.(data, false);
          },
          onError: (error) => {
            setIsLoading(false);
            // Don't callback if request was cancelled
            if (error.name !== 'AbortError') {
              callback?.(null, false);
            }
          }
        });
      } else {
        // Request was superseded, just clear debouncing state
        setIsDebouncing(false);
        setIsLoading(false);
      }
    }, dynamicDebounce);

    // Return cleanup function with cancellation support
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setIsDebouncing(false);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    };
  }, [modelBuilder, queryClient]);

  // Batch processing for multiple rapid requests
  const batchRequests = useRef<Array<{
    params: BuildModelRequest;
    callback?: (response: BuildModelResponse | null, fromCache?: boolean) => void;
    timestamp: number;
  }>>([]);

  const processBatch = useCallback(() => {
    if (batchRequests.current.length === 0) return;

    // Get the most recent request from the batch
    const latestRequest = batchRequests.current[batchRequests.current.length - 1];
    
    // Clear the batch
    const currentBatch = [...batchRequests.current];
    batchRequests.current = [];

    // Process only the latest request but notify all callbacks
    buildModelWithAdvancedDebounce(latestRequest.params, (response, fromCache) => {
      // Notify all callbacks in the batch with the same result
      currentBatch.forEach(request => {
        request.callback?.(response, fromCache);
      });
    }, { priority: 'high', debounceMs: 100 });

  }, [buildModelWithAdvancedDebounce]);

  const addToBatch = useCallback((
    params: BuildModelRequest,
    callback?: (response: BuildModelResponse | null, fromCache?: boolean) => void
  ) => {
    batchRequests.current.push({
      params,
      callback,
      timestamp: Date.now()
    });

    // Process batch after a short delay
    setTimeout(processBatch, 50);
  }, [processBatch]);

  // Enhanced real-time statistics
  const stats = useMemo(() => ({
    cacheSize: advancedCache.size(),
    cacheHitRate,
    requestCount: requestCountRef.current,
    isOptimizedForRealTime: true
  }), [cacheHitRate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      batchRequests.current = [];
    };
  }, []);

  // Clear cache method for external use
  const clearCache = useCallback(() => {
    advancedCache.clear();
    setCacheHitRate(0);
  }, []);

  // Enhanced cleanup function that cancels all pending requests
  const cancelAllRequests = useCallback(() => {
    // Cancel current debounced request
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsDebouncing(false);
    }
    
    // Cancel current network request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
    
    // Clear batch queue
    batchRequests.current = [];
  }, []);
  
  // Enhanced cache management with react-query integration
  const enhancedClearCache = useCallback(() => {
    advancedCache.clear();
    setCacheHitRate(0);
    requestCountRef.current = 0;
    // Also clear react-query cache for buildModel queries
    queryClient.removeQueries({ queryKey: ['buildModel'] });
  }, [queryClient]);

  return {
    buildModel: buildModelWithAdvancedDebounce,
    buildModelBatch: addToBatch,
    isBuilding: modelBuilder.isPending || isDebouncing || isLoading,
    isLoading, // New: separate loading state for network requests
    error: modelBuilder.error,
    reset: modelBuilder.reset,
    lastResponse: modelBuilder.data,
    stats: {
      ...stats,
      hasActiveRequests: isLoading,
      supportsRequestCancellation: true,
      reactQueryIntegration: true
    },
    clearCache: enhancedClearCache,
    cancelAllRequests, // New: cancel all pending requests
    // Backward compatibility
    buildModelWithDebounce: buildModelWithAdvancedDebounce
  };
}