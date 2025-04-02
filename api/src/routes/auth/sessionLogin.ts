import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

export const sessionLoginHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // req.userId is attached by ensureAuthenticated
  const userId = req.userId;
  if (!userId) {
    // Should not happen if ensureAuthenticated works
    res
      .status(401)
      .json({ message: "User ID not found after JWT validation." });
    return; // Explicitly return void
  }

  // Create the user object expected by serializeUser
  const userToSerialize = { id: userId };

  // Use req.login() provided by Passport to establish the session
  if (req.login) {
    req.login(userToSerialize, (err) => {
      if (err) {
        console.error(
          "Error establishing Passport session via req.login:",
          err
        );
        return next(err); // Pass error to global handler
      }
      console.log(`Passport session established for user ID: ${userId}`);
      res.status(200).json({ message: "Session established successfully." });
    });
  } else {
    console.error("req.login function is not available");
    res.status(500).json({ message: "Session setup failed - internal error" });
  }
};
