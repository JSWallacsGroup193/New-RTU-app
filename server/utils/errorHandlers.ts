import type { Response } from "express";
import { z } from "zod";
import type { 
  ErrorResponse,
  ValidationErrorResponse,
  NotFoundErrorResponse,
  ConflictErrorResponse,
  CapacityErrorResponse,
  InternalErrorResponse
} from "@shared/schema";

// ============================================================================
// STANDARDIZED ERROR HANDLER UTILITIES
// ============================================================================

/**
 * Generate a unique request ID for error tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Standard validation error response (400)
 */
export function handleValidationError(
  res: Response, 
  error: z.ZodError, 
  customMessage?: string
): Response {
  const errorResponse: ValidationErrorResponse = {
    error: "Validation error",
    code: "VALIDATION_FAILED",
    message: customMessage || "Invalid request format",
    details: error.errors.map(err => ({
      path: err.path,
      message: err.message,
      code: err.code
    })),
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };

  return res.status(400).json(errorResponse);
}

/**
 * Standard not found error response (404)
 */
export function handleNotFoundError(
  res: Response, 
  resource: string, 
  id?: string
): Response {
  const errorResponse: NotFoundErrorResponse = {
    error: "Not found",
    code: "RESOURCE_NOT_FOUND",
    message: id 
      ? `${resource} with ID "${id}" does not exist`
      : `${resource} not found`,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };

  return res.status(404).json(errorResponse);
}

/**
 * Standard conflict error response (409)
 */
export function handleConflictError(
  res: Response, 
  message: string, 
  details?: any
): Response {
  const errorResponse: ConflictErrorResponse = {
    error: "Conflict",
    code: "RESOURCE_CONFLICT",
    message,
    details,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };

  return res.status(409).json(errorResponse);
}

/**
 * Project capacity exceeded error response (400)
 */
export function handleCapacityError(
  res: Response, 
  currentCount: number, 
  maxCapacity: number = 20
): Response {
  const errorResponse: CapacityErrorResponse = {
    error: "Project capacity exceeded",
    code: "PROJECT_CAPACITY_EXCEEDED",
    message: `Project has reached the maximum limit of ${maxCapacity} units`,
    details: {
      currentCount,
      maxCapacity,
      remainingCapacity: Math.max(0, maxCapacity - currentCount)
    },
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };

  return res.status(400).json(errorResponse);
}

/**
 * Standard internal server error response (500)
 */
export function handleInternalError(
  res: Response, 
  operation: string, 
  error: unknown
): Response {
  // Log the error for debugging
  console.error(`Internal error during ${operation}:`, error);

  const errorResponse: InternalErrorResponse = {
    error: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
    message: `An error occurred while ${operation}`,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };

  return res.status(500).json(errorResponse);
}

/**
 * Custom error response for specific business logic errors
 */
export function handleCustomError(
  res: Response,
  statusCode: number,
  errorType: string,
  code: string,
  message: string,
  details?: any
): Response {
  const errorResponse: ErrorResponse = {
    error: errorType,
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };

  return res.status(statusCode).json(errorResponse);
}

/**
 * Centralized error handler that determines the appropriate response
 * based on the error type
 */
export function handleError(
  res: Response,
  error: unknown,
  operation: string,
  customMessage?: string
): Response {
  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return handleValidationError(res, error, customMessage);
  }

  // Handle specific error messages
  if (error instanceof Error) {
    // Project capacity errors
    if (error.message.includes("maximum limit")) {
      return handleCapacityError(res, 20); // Assuming max capacity reached
    }

    // Custom business logic errors can be handled here
    if (error.message.includes("not found")) {
      return handleNotFoundError(res, "Resource");
    }

    if (error.message.includes("already exists")) {
      return handleConflictError(res, error.message);
    }
  }

  // Default to internal server error
  return handleInternalError(res, operation, error);
}

/**
 * Express middleware for unhandled errors
 */
export function globalErrorHandler(
  error: any,
  req: any,
  res: Response,
  next: any
): void {
  if (res.headersSent) {
    return next(error);
  }

  handleInternalError(res, "processing request", error);
}

/**
 * Helper to validate request body with Zod schema
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Helper to validate request params with Zod schema
 */
export function validateRequestParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  return validateRequestBody(schema, params);
}

/**
 * Type guard for checking if an error is a known error type
 */
export function isKnownError(error: unknown): error is Error {
  return error instanceof Error;
}