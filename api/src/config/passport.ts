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

// Type definitions from ../types/express.d.ts are loaded automatically by TS

dotenv.config();

const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
// Construct callback URLs using API_BASE_URL
const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3001";
const googleCalendarCallbackURL = `${apiBaseUrl}/api/auth/google/callback`;
const googleHealthCallbackURL = `${apiBaseUrl}/api/auth/google-health/callback`;

if (!googleClientID || !googleClientSecret) {
  console.error("Google OAuth Client ID or Secret missing in .env");
  process.exit(1);
}

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
        callbackURL: googleCalendarCallbackURL, // Use constructed URL
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
        clientID: googleClientID!,
        clientSecret: googleClientSecret!,
        callbackURL: googleHealthCallbackURL, // Use constructed URL
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
  // Note: Express.User is augmented in ../types/express.d.ts to include 'id'
  passportInstance.serializeUser((user: Express.User, done) => {
    console.log("Serialize User ID:", user.id); // user.id should now be recognized
    done(null, user.id);
  });

  // Retrieves the user from the stored ID in the session.
  passportInstance.deserializeUser((id: string, done) => {
    console.log("Deserialize User ID:", id);
    // Attach the ID to req.user, matching the augmented Express.User type
    done(null, { id: id });
  });
}
