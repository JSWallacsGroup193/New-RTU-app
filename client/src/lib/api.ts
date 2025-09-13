import { DecodeResponse, SpecSearchResponse, SpecSearchInput } from "@shared/schema";

// Decode model number API call
export const decodeModelNumber = async (params: {
  modelNumber: string;
  efficiencyPreference?: {
    minSEER?: number;
    preferredLevel?: "standard" | "high" | "premium";
    energySavings?: boolean;
  };
}): Promise<DecodeResponse> => {
  const response = await fetch("/api/decode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to decode model number");
  }

  return response.json();
};

// Search by specifications API call
export const searchBySpecs = async (params: SpecSearchInput): Promise<SpecSearchResponse> => {
  const response = await fetch("/api/search-specs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to search specifications");
  }

  return response.json();
};

// Health check API call
export const healthCheck = async () => {
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error("Health check failed");
  }
  return response.json();
};

// Get supported manufacturers
export const getSupportedManufacturers = async () => {
  const response = await fetch("/api/manufacturers");
  if (!response.ok) {
    throw new Error("Failed to fetch supported manufacturers");
  }
  return response.json();
};