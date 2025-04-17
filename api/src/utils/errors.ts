// Base class for custom application errors
export class AppError extends Error {
  // Added export
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// 400 Bad Request - Used for general validation errors
export class BadRequestError extends AppError {
  constructor(message = "Bad Request", details?: any) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

// 400 Bad Request - Specifically for input validation failures
export class ValidationError extends AppError {
  constructor(message = "Validation Failed", details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

// 401 Unauthorized - Used when authentication is required and has failed or has not yet been provided.
export class AuthenticationError extends AppError {
  constructor(message = "Authentication Required") {
    super(message, 401, "UNAUTHENTICATED");
  }
}

// 403 Forbidden - Used when the server understands the request but refuses to authorize it.
export class AuthorizationError extends AppError {
  constructor(message = "Permission Denied") {
    super(message, 403, "FORBIDDEN");
  }
}

// 404 Not Found - Used when the requested resource could not be found.
export class NotFoundError extends AppError {
  constructor(message = "Resource Not Found") {
    super(message, 404, "NOT_FOUND");
  }
}

// 409 Conflict - Used when a request conflicts with the current state of the server (e.g., unique constraint violation).
export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: any) {
    super(message, 409, "CONFLICT", details);
  }
}

// 429 Too Many Requests - Used for rate limiting.
export class TooManyRequestsError extends AppError {
  constructor(message = "Too Many Requests", details?: any) {
    super(message, 429, "TOO_MANY_REQUESTS", details);
  }
}

// 500 Internal Server Error - Used for unexpected server errors.
export class InternalServerError extends AppError {
  constructor(message = "Internal Server Error", details?: any) {
    super(message, 500, "INTERNAL_SERVER_ERROR", details);
  }
}
