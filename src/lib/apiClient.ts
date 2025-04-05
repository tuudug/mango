import { Session } from "@supabase/supabase-js";

interface ApiErrorParams {
  status: number;
  message: string;
  body?: any; // Parsed JSON error body if possible, or text
}

/**
 * Custom error class for API errors.
 * Contains the HTTP status code and potentially the parsed error body.
 */
export class ApiError extends Error {
  status: number;
  errorBody?: any;

  constructor({ status, message, body }: ApiErrorParams) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorBody = body;
    // Set the prototype explicitly for correct instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Helper function to parse error response body
async function parseErrorBody(
  response: Response
): Promise<{ body: any; message: string }> {
  let errorBody: any = null;
  let errorMessage = `HTTP error! status: ${response.status}`;
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      errorBody = await response.json();
      if (errorBody && typeof errorBody.message === "string") {
        errorMessage = errorBody.message;
      }
    } else {
      const textBody = await response.text();
      errorBody = textBody;
      if (textBody) {
        errorMessage = textBody;
      }
    }
  } catch (e) {
    console.warn("Could not parse error response body:", e);
    errorMessage = `HTTP error! status: ${response.status}`;
    try {
      errorBody = await response.text();
    } catch {
      /* Ignore secondary text read error */
    }
  }
  return { body: errorBody, message: errorMessage };
}

/**
 * Performs an authenticated fetch request to the backend API.
 * Handles adding Authorization header, basic error handling, and retries on 401.
 *
 * @param url The API endpoint URL (relative to the base URL, e.g., '/api/todos')
 * @param method The HTTP method ('GET', 'POST', 'PUT', 'DELETE')
 * @param session The Supabase session object containing the access token
 * @param body Optional request body for POST/PUT requests
 * @returns A promise that resolves with the parsed JSON response (type T)
 * @throws {ApiError} If the response status is not ok (>= 400) after potential retry
 * @throws {Error} For network errors or other issues during fetch/parsing
 */
export async function authenticatedFetch<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  session: Session | null,
  body?: Record<string, any> | null
): Promise<T> {
  if (!session?.access_token) {
    throw new Error("Authentication required: No active session token found.");
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${session.access_token}`,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PUT")) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    // Initial fetch attempt
    response = await fetch(url, options);

    // Check for 401 Unauthorized and retry once after a delay
    if (response.status === 401) {
      console.warn(
        `Received 401 for ${method} ${url}. Retrying after delay...`
      );
      await new Promise((resolve) => setTimeout(resolve, 750)); // Wait 750ms

      // Retry the fetch
      response = await fetch(url, options);
      console.log(`Retry status for ${method} ${url}: ${response.status}`);
    }
  } catch (networkError) {
    console.error("Network error during authenticatedFetch:", networkError);
    throw networkError; // Re-throw network errors immediately
  }

  // Process the final response (either initial or after retry)
  if (!response.ok) {
    const { body: errorBody, message: errorMessage } = await parseErrorBody(
      response
    );
    throw new ApiError({
      status: response.status,
      message: errorMessage,
      body: errorBody,
    });
  }

  // Handle successful responses
  if (response.status === 204) {
    return undefined as T; // Handle No Content
  }

  try {
    const responseData = await response.json();
    return responseData as T;
  } catch (jsonError) {
    console.error("Failed to parse successful response JSON:", jsonError);
    throw new Error("Failed to parse server response.");
  }
}
