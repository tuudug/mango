import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors"; // Import the base error class

interface ErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction // next is required for Express error handlers, even if not used
): void => {
  let statusCode = 500;
  let errorCode = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected error occurred on the server.";
  let details: any | undefined;

  if (err instanceof AppError) {
    // Use properties from our custom AppError
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    details = err.details;
    console.error(
      `[AppError] ${statusCode} - ${errorCode}: ${message}`,
      details ? JSON.stringify(details) : ""
    );
  } else {
    // Handle generic errors (log the full error for debugging)
    console.error("[UnhandledError]", err);
    // Keep generic message for the client
    message = "Internal Server Error";
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: message,
    },
  };

  if (details) {
    errorResponse.error.details = details;
  }

  // Ensure headers aren't already sent before sending response
  if (!res.headersSent) {
    res.status(statusCode).json(errorResponse);
  }
};
