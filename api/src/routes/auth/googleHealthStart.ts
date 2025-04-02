import { Response, NextFunction } from "express";
import passport from "passport";
import { AuthenticatedRequest } from "../../middleware/auth";

export const googleHealthStartHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userIdFromSession = req.user?.id;
  if (userIdFromSession) {
    req.session.supabaseUserId = userIdFromSession; // Store ID for callback linking
    console.log(
      `Storing supabaseUserId (${userIdFromSession}) in session for Google Health OAuth link.`
    );
    // Use the 'google-health' strategy
    const authOptions: passport.AuthenticateOptions & {
      accessType?: string;
      prompt?: string;
    } = {
      accessType: "offline",
      prompt: "consent",
    };
    passport.authenticate("google-health", authOptions)(req, res, next);
  } else {
    console.error(
      "Error starting Google Health OAuth: User ID not found in session/req.user."
    );
    res.status(401).json({ message: "User session invalid." });
  }
};
