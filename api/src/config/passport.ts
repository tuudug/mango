import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import dotenv from "dotenv";
import { Request } from "express"; // Import Request type
import { supabaseAdmin } from "../supabaseClient"; // Use admin client for token storage
import { encrypt } from "../utils/crypto"; // Import the encrypt function

dotenv.config();

// Define session interface to include our custom property
declare module "express-session" {
  interface SessionData {
    supabaseUserId?: string;
  }
}

const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackURL = process.env.GOOGLE_REDIRECT_URI;

if (!googleClientID || !googleClientSecret || !googleCallbackURL) {
  console.error("Google OAuth credentials or callback URL missing in .env");
  process.exit(1);
}

// Placeholder for user type - replace with actual user model later
type User = { id: string /* other properties */ };

export default function configurePassport(
  passportInstance: passport.PassportStatic
) {
  // --- Google Calendar Strategy ---
  passportInstance.use(
    "google", // Explicitly name the strategy
    new GoogleStrategy(
      {
        clientID: googleClientID!,
        clientSecret: googleClientSecret!,
        callbackURL: googleCallbackURL!, // Calendar callback
        passReqToCallback: true,
        scope: [
          "profile",
          "email",
          "https://www.googleapis.com/auth/calendar.readonly",
          "https://www.googleapis.com/auth/calendar.events.readonly",
        ],
      },
      async (
        req: Request, // Add request object to the callback signature
        accessToken: string,
        refreshToken: string | undefined, // refreshToken might not always be sent
        profile: Profile,
        done: VerifyCallback
      ) => {
        // This is the verify callback
        console.log("Google Strategy Verify Callback Triggered");
        console.log("Profile ID:", profile.id);
        console.log("Display Name:", profile.displayName);
        console.log("Email:", profile.emails?.[0]?.value);
        // console.log('Access Token:', accessToken); // Sensitive, avoid logging in production
        // console.log('Refresh Token:', refreshToken); // Sensitive, MUST be stored securely

        // **TODO: Implement User Linking and Token Storage**
        // 1. Get the Supabase user ID stored in the session during the /google/start route
        const supabaseUserId = req.session?.supabaseUserId;

        if (!supabaseUserId) {
          console.error(
            "Google Verify Callback Error: Supabase user ID not found in session."
          );
          // Redirect or signal error - cannot link without user ID
          return done(
            new Error(
              "User session not found. Please initiate authentication again."
            )
          );
        }
        console.log(
          `Linking Google profile to Supabase user ID: ${supabaseUserId}`
        );
        // Clear the ID from session now that we have it
        delete req.session.supabaseUserId;

        // 2. Encrypt the tokens before storing
        let encryptedAccessToken: string | null = null;
        let encryptedRefreshToken: string | null = null;
        try {
          encryptedAccessToken = encrypt(accessToken);
          if (refreshToken) {
            encryptedRefreshToken = encrypt(refreshToken);
          }
        } catch (encError) {
          console.error("Failed to encrypt tokens:", encError);
          return done(
            new Error("Failed to secure Google Calendar credentials.")
          );
        }

        // 3. Upsert Google Calendar connection
        try {
          const connectionData = {
            user_id: supabaseUserId,
            provider: "google_calendar", // Specific provider
            account_identifier: profile.emails?.[0]?.value || profile.id,
            credentials: {
              access_token: encryptedAccessToken,
              refresh_token: encryptedRefreshToken, // Store encrypted token (if present)
              expiry_date: null, // Google strategy doesn't provide expiry directly here, handle later
              scope: "profile email calendar.readonly calendar.events.readonly",
              google_profile_id: profile.id,
            },
            updated_at: new Date().toISOString(),
          };

          const { data, error } = await supabaseAdmin
            .from("data_source_connections")
            .upsert(connectionData, { onConflict: "user_id, provider" })
            .select()
            .single();

          if (error) {
            console.error(
              "Error saving Google Calendar connection to Supabase:",
              error
            );
            return done(error);
          }

          console.log("Google Calendar connection upserted:", data);
          return done(null, { id: supabaseUserId });
        } catch (err) {
          console.error(
            "Error during Google Calendar strategy verification/upsert:",
            err
          );
          return done(err);
        }
      }
    )
  );

  // --- Google Health/Fitness Strategy ---
  passportInstance.use(
    "google-health", // Name this strategy differently
    new GoogleStrategy(
      {
        clientID: googleClientID!, // Reuse same client ID/secret
        clientSecret: googleClientSecret!,
        callbackURL: `${
          process.env.API_BASE_URL || "http://localhost:3001"
        }/api/auth/google-health/callback`, // Specific health callback
        passReqToCallback: true,
        scope: [
          "profile",
          "email",
          "https://www.googleapis.com/auth/fitness.activity.read", // Scope for reading steps
          // Add other fitness scopes if needed later (e.g., location, sleep)
        ],
      },
      async (
        req: Request,
        accessToken: string,
        refreshToken: string | undefined,
        profile: Profile,
        done: VerifyCallback
      ) => {
        console.log("Google Health Strategy Verify Callback Triggered");
        const supabaseUserId = req.session?.supabaseUserId;

        if (!supabaseUserId) {
          console.error(
            "Google Health Verify Callback Error: Supabase user ID not found in session."
          );
          return done(
            new Error(
              "User session not found. Please initiate authentication again."
            )
          );
        }
        console.log(
          `Linking Google Health profile to Supabase user ID: ${supabaseUserId}`
        );
        delete req.session.supabaseUserId;

        // Encrypt tokens
        let encryptedAccessToken: string | null = null;
        let encryptedRefreshToken: string | null = null;
        try {
          encryptedAccessToken = encrypt(accessToken);
          if (refreshToken) {
            encryptedRefreshToken = encrypt(refreshToken);
          }
        } catch (encError) {
          console.error("Failed to encrypt Google Health tokens:", encError);
          return done(new Error("Failed to secure Google Health credentials."));
        }

        // Upsert Google Health connection
        try {
          const connectionData = {
            user_id: supabaseUserId,
            provider: "google_health", // Specific provider
            account_identifier: profile.emails?.[0]?.value || profile.id,
            credentials: {
              access_token: encryptedAccessToken,
              refresh_token: encryptedRefreshToken,
              scope: "profile email fitness.activity.read", // Store granted scopes
              google_profile_id: profile.id,
            },
            updated_at: new Date().toISOString(),
          };

          const { data, error } = await supabaseAdmin
            .from("data_source_connections")
            .upsert(connectionData, { onConflict: "user_id, provider" })
            .select()
            .single();

          if (error) {
            console.error(
              "Error saving Google Health connection to Supabase:",
              error
            );
            return done(error);
          }

          console.log("Google Health connection upserted:", data);
          return done(null, { id: supabaseUserId });
        } catch (err) {
          console.error(
            "Error during Google Health strategy verification/upsert:",
            err
          );
          return done(err);
        }
      }
    )
  );

  // --- Session Management (Shared for both strategies) ---
  // Stores the user ID (from Supabase) in the session.
  passportInstance.serializeUser((user, done) => {
    // 'user' here is the object passed from the 'done' callback in the strategy ({ id: supabaseUserId })
    console.log("Serialize User ID:", (user as User).id);
    done(null, (user as User).id);
  });

  // Retrieves the user ID from the session. Attaches a minimal user object to req.user.
  // Note: This doesn't fetch full user details from DB, which might be needed elsewhere.
  // The primary goal here is to re-populate req.user for session continuity if needed.
  // Our API routes rely on the JWT via ensureAuthenticated, not this deserialized user.
  passportInstance.deserializeUser((id, done) => {
    console.log("Deserialize User ID:", id);
    // For now, just pass back the ID in a user-like object.
    // If full user details were needed from DB based on session, fetch here.
    done(null, { id: id as string }); // Attach minimal user object { id: '...' } to req.user
  });
}
