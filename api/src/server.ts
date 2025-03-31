import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
// We will create this file next
import configurePassport from "./config/passport";
import authRoutes from "./routes/auth"; // Import the auth routes
import calendarRoutes from "./routes/calendar"; // Import the calendar routes

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;
const sessionSecret = process.env.SESSION_SECRET;

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

app.listen(port, () => {
  console.log(`[server]: API Server is running at http://localhost:${port}`);
});
