import { useQuery } from "@tanstack/react-query";
import { getFamilyOptions } from "@/lib/api";
import { FamilyOptionsRequest, DaikinFamilyKeys } from "@shared/schema";

export function useFamilyOptions(params: FamilyOptionsRequest) {
  return useQuery({
    queryKey: ["/api/family-options", params.family, params.manufacturer],
    queryFn: () => getFamilyOptions(params),
    enabled: !!(params.family || params.manufacturer),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useAllFamilyOptions() {
  return useQuery({
    queryKey: ["/api/family-options", "all"],
    queryFn: () => getFamilyOptions({ manufacturer: "Daikin" }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

export function useSpecificFamilyOptions(family: DaikinFamilyKeys) {
  return useQuery({
    queryKey: ["/api/family-options", family],
    queryFn: () => getFamilyOptions({ family }),
    enabled: !!family,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}