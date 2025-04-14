import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import passport from "passport";
import session from "express-session";
import setupPassport from "./config/passport"; // Correct: Use default import
import { ensureAuthenticated } from "./middleware/auth"; // Import auth middleware

// Import route handlers
import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboards";
import todoRoutes from "./routes/todos";
import calendarRoutes from "./routes/calendar";
import healthRoutes from "./routes/health";
import financeRoutes from "./routes/finance"; // Import new finance routes
import habitsRoutes from "./routes/habits"; // Import new habits routes
import userRoutes from "./routes/user"; // Import the new user routes
import questsRoutes from "./routes/quests"; // Import the new quests routes
import notificationsRoutes from "./routes/notifications"; // Import notification routes
import yuzuRoutes from "./routes/yuzu";

dotenv.config(); // Load environment variables from .env file

const app: Express = express();
const port = process.env.PORT || 3001;

// --- Middleware ---
// Trust the first hop (common for platforms like DO App Platform)
// This allows 'secure: true' cookies and req.protocol to work correctly behind a proxy
app.set("trust proxy", 1);

// Enable CORS for all origins (adjust for production)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Allow frontend origin
    credentials: true, // Allow cookies/auth headers
  })
);

// Parse JSON request bodies
app.use(express.json());

// Session middleware (required for Passport session)
// Ensure SECRET is set in your environment variables
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.error("FATAL ERROR: SESSION_SECRET environment variable is not set.");
  process.exit(1); // Exit if secret is not set
}
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true, // Prevent client-side JS access
      maxAge: 24 * 60 * 60 * 1000, // Example: 1 day session duration
    },
  })
);

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// Setup Passport strategies (Google, etc.)
setupPassport(passport); // Call the imported default function

// --- Routes ---
// Public routes (like auth callbacks)
app.use("/api/auth", authRoutes);

// Protected routes (apply authentication middleware)
// Note: ensureAuthenticated is now applied within each specific router
// app.use(ensureAuthenticated); // Remove global application here

app.use("/api/dashboards", dashboardRoutes); // Already uses ensureAuthenticated internally
app.use("/api/todos", todoRoutes); // Already uses ensureAuthenticated internally
app.use("/api/calendar", calendarRoutes); // Already uses ensureAuthenticated internally
app.use("/api/health", healthRoutes); // Already uses ensureAuthenticated internally
app.use("/api/finance", financeRoutes); // Add finance routes (uses ensureAuthenticated internally)
app.use("/api/habits", habitsRoutes); // Add habits routes (uses ensureAuthenticated internally)
app.use("/api/user", userRoutes); // Add the user routes
app.use("/api/quests", questsRoutes); // Add the quests routes
app.use("/api/notifications", notificationsRoutes); // Add notification routes (uses ensureAuthenticated internally)
app.use("/api/yuzu", yuzuRoutes);

// Simple root route
app.get("/api", (req: Request, res: Response) => {
  res.send("Mango API is running!");
});

// --- Global Error Handler ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Global Error Handler:", err.stack || err);
  // Check for specific Supabase errors if needed, otherwise send generic error
  // Example: Check for specific error codes or messages
  // if (err.code === 'SOME_SUPABASE_CODE') { ... }
  res.status(500).json({ message: "Internal Server Error" });
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
