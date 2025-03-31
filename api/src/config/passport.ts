import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import dotenv from "dotenv";
import { supabaseAdmin } from "../supabaseClient"; // Use admin client for token storage

dotenv.config();

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
  passportInstance.use(
    new GoogleStrategy(
      {
        clientID: googleClientID!,
        clientSecret: googleClientSecret!,
        callbackURL: googleCallbackURL!,
        scope: [
          "profile", // Basic profile info
          "email", // User's email address
          "https://www.googleapis.com/auth/calendar.readonly", // Read access to calendars
          "https://www.googleapis.com/auth/calendar.events.readonly", // Read access to events
        ],
        // accessType and prompt will be handled in the auth route initiation
      },
      async (
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
        // 1. Get the currently logged-in user ID for *our* application.
        //    This requires our app's own authentication system to be in place first.
        //    For now, we cannot link this Google connection to a specific Supabase user.
        const currentUserId = "PLACEHOLDER_USER_ID"; // Replace with actual user ID logic later

        // 2. Encrypt the tokens before storing
        //    Requires an encryption library (e.g., crypto) and a secret key
        const encryptedAccessToken = accessToken; // Replace with actual encryption
        const encryptedRefreshToken = refreshToken; // Replace with actual encryption

        // 3. Find or create the data_source_connection record in Supabase
        try {
          // Check if a connection already exists for this Google profile ID for this user
          // We need a way to store profile.id securely if we want to use it for lookup
          // Or maybe use email as an identifier if unique? For now, we'll just insert/update based on provider/user.

          const connectionData = {
            // user_id: currentUserId, // Add this once user linking is implemented
            provider: "google_calendar",
            account_identifier: profile.emails?.[0]?.value || profile.id,
            credentials: {
              access_token: encryptedAccessToken,
              refresh_token: encryptedRefreshToken,
              expiry_date: null, // Google strategy doesn't provide expiry directly here, handle later
              scope: "profile email calendar.readonly calendar.events.readonly",
              google_profile_id: profile.id, // Store Google's unique ID
            },
            updated_at: new Date().toISOString(),
          };

          // Upsert the connection based on user_id and provider (and maybe google_profile_id?)
          // Since user_id is placeholder, this won't work correctly yet.
          // For demonstration, let's assume we just insert for now (will create duplicates without user linking)
          const { data, error } = await supabaseAdmin
            .from("data_source_connections")
            .insert({ ...connectionData, user_id: currentUserId }) // Add user_id here when available
            .select()
            .single();

          if (error) {
            console.error("Error saving Google connection to Supabase:", error);
            return done(error);
          }

          console.log("Google connection saved/updated:", data);

          // **TODO:** Pass the actual user object found/created in our system
          const user: User = { id: currentUserId }; // Placeholder user object
          return done(null, user); // Pass user object to serializeUser
        } catch (err) {
          console.error("Error during Google strategy verification:", err);
          return done(err);
        }
      }
    )
  );

  // --- Session Management ---
  // Determines which data of the user object should be stored in the session.
  passportInstance.serializeUser((user, done) => {
    console.log("Serialize User:", user);
    // **TODO:** Serialize the actual user ID from our database
    done(null, (user as User).id); // Store user ID in session
  });

  // Retrieves the user data based on the ID stored in the session.
  passportInstance.deserializeUser(async (id, done) => {
    console.log("Deserialize User ID:", id);
    try {
      // **TODO:** Fetch the actual user from our database using the id
      // const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single();
      // if (error || !user) {
      //     return done(error || new Error('User not found'));
      // }
      const user: User = { id: id as string }; // Placeholder user object
      done(null, user); // Attach user object to req.user
    } catch (error) {
      done(error);
    }
  });
}
