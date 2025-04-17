# API Error Handling System (v0.3.1 Refactor)

This document outlines the standardized error handling mechanism implemented in the Mango API server (`/api`).

## Goal

To provide consistent, informative error responses to the client and improve backend code maintainability by centralizing error handling logic.

## Key Components

1.  **Custom Error Classes (`api/src/utils/errors.ts`):**

    - A base `AppError` class extends the built-in `Error` class. It includes standard properties like `statusCode` (HTTP status), `errorCode` (a machine-readable code), and optional `details`.
    - Specific error classes inherit from `AppError` for common HTTP error scenarios:
      - `BadRequestError` (400): General client-side errors.
      - `ValidationError` (400): Specifically for invalid input data (e.g., request body, query params). `errorCode`: `VALIDATION_ERROR`.
      - `AuthenticationError` (401): Missing or invalid authentication credentials. `errorCode`: `UNAUTHENTICATED`.
      - `AuthorizationError` (403): Authenticated user lacks permission for the action. `errorCode`: `FORBIDDEN`.
      - `NotFoundError` (404): Requested resource does not exist. `errorCode`: `NOT_FOUND`.
      - `InternalServerError` (500): Unexpected server-side errors (database issues, unhandled exceptions). `errorCode`: `INTERNAL_SERVER_ERROR`.

2.  **Global Error Handling Middleware (`api/src/middleware/errorHandler.ts`):**
    - This Express middleware is registered _last_ in `api/src/server.ts`.
    - It catches errors passed via the `next(error)` function from route handlers or other middleware.
    - It checks if the error is an instance of `AppError`.
      - If yes, it uses the `statusCode`, `message`, `errorCode`, and `details` from the custom error to construct a standardized JSON error response.
      - If no (i.e., a generic `Error` or other exception), it logs the full error stack for debugging but returns a generic 500 Internal Server Error response to the client with a standard message and `INTERNAL_SERVER_ERROR` code.
    - It ensures headers haven't already been sent before sending the JSON error response.

## Usage in Route Handlers

Route handlers (`api/src/routes/**/*.ts`) should now adhere to the following pattern:

1.  **Import necessary custom error classes** from `../../utils/errors`.
2.  **Include `next: NextFunction`** in the handler function signature.
3.  **Replace direct `res.status(code).json(...)` calls for errors** with `next(new CustomErrorType(...))`.
    - Use `ValidationError` for invalid request bodies or parameters.
    - Use `BadRequestError` for other logical client errors (e.g., trying to move an item beyond boundaries).
    - Use `NotFoundError` when a specific resource (identified by ID) isn't found for the authenticated user.
    - Use `AuthenticationError` or `AuthorizationError` if middleware checks fail unexpectedly (though middleware should ideally handle this).
    - Use `InternalServerError` for database errors or other unexpected server-side issues.
4.  **Wrap database/service calls in `try...catch` blocks.**
    - Inside the `try` block, handle expected successful responses (`res.status(200/201/204).json(...)`).
    - Inside the `catch (err)` block, pass the caught error to the global handler: `next(err)`. This allows the middleware to handle formatting the response correctly, whether it's a custom `AppError` thrown intentionally or an unexpected generic error.

## Benefits

- **Consistency:** All API errors follow the same JSON structure (`{ success: false, error: { code, message, details? } }`).
- **Clarity:** Specific error codes and messages help the frontend understand the nature of the error.
- **Security:** Prevents leaking sensitive stack traces or internal details in generic error responses.
- **Maintainability:** Centralizes error response formatting and logging in the middleware. Route handlers focus on business logic and throwing appropriate error types.
