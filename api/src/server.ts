import express, { Express, Request, Response, NextFunction } from "express"; // Add NextFunction
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
// We will create this file next
import configurePassport from "./config/passport";
import authRoutes from "./routes/auth";
import calendarRoutes from "./routes/calendar";
import healthRoutes from "./routes/health";
import todosRoutes from "./routes/todos"; // Import the todos routes

dotenv.config();

const app: Express = express();
// Use the PORT environment variable provided by the platform (e.g., DigitalOcean)
// Defaulting locally might still be useful, but prioritize process.env.PORT
const port = process.env.PORT || 3001; // Keep default for local dev if needed
const sessionSecret = process.env.SESSION_SECRET;

if (!process.env.PORT) {
  console.warn(
    "PORT environment variable not set. Defaulting to 3001 for local development."
  );
}

if (!sessionSecret) {
  console.error("Error: SESSION_SECRET is not defined in .env file.");
  process.exit(1);
}

// Session middleware configuration
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false, // Don't save sessions until something is stored
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      maxAge: 1000 * 60 * 60 * 24, // Session duration: 1 day
    },
  })
);

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategies
configurePassport(passport);

app.use(express.json());

// Simple root route for testing
app.get("/api", (req: Request, res: Response) => {
  res.send("Mango API is running!");
});

// Mount authentication routes
app.use("/api/auth", authRoutes);

// Mount calendar routes
app.use("/api/calendar", calendarRoutes);

// Mount health routes
app.use("/api/health", healthRoutes);

// Mount todos routes
app.use("/api/todos", todosRoutes);

// --- Global Error Handler ---
// This middleware MUST be defined AFTER all other app.use() and routes calls
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  // Type checking for unknown error type
  let httpError: HttpError;
  if (err instanceof Error) {
    httpError = err as HttpError; // Cast to HttpError after checking it's an Error
    console.error("[Global Error Handler]:", httpError.message);
    console.error(httpError.stack); // Log the stack trace for debugging
  } else {
    // Handle cases where the thrown value is not an Error object
    console.error("[Global Error Handler]: Received non-Error value:", err);
    // Create a default Error object
    httpError = new Error("An unexpected error occurred.") as HttpError;
    httpError.status = 500;
  }

  // Determine status code - default to 500 if not set
  const statusCode = httpError.statusCode || httpError.status || 500;

  // Send a generic error response
  res.status(statusCode).json({
    message: httpError.message || "An unexpected error occurred on the server.",
    // Optionally include stack in development
    stack: process.env.NODE_ENV === "development" ? httpError.stack : undefined,
  });
});

// --- Custom Error Interface (Placed after the middleware for clarity) ---
interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

app.listen(port, () => {
  console.log(`[server]: API Server is running at http://localhost:${port}`);
});
