
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

// ==========================================
// REQUIRE AUTHENTICATION
// ==========================================

async function requireAuth(req, res, next) {
  try {
    // 1. Read JWT from HTTP cookie
    const token = req.cookies?.access_token;

    if (!token || typeof token !== "string") {
      return res.status(401).json({
        success: false,
        message: "Please log in",
      });
    }

    // 2. Check JWT configuration
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      const error = new Error(
        "JWT_SECRET is not configured"
      );

      return next(error);
    }

    // 3. Verify JWT
    let payload;

    try {
      payload = jwt.verify(token, secret, {
        algorithms: ["HS256"],
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid",
      });
    }

    // 4. Validate JWT payload
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.sub !== "string" ||
      !mongoose.isObjectIdOrHexString(payload.sub) ||
      typeof payload.iat !== "number"
    ) {
      return res.status(401).json({
        success: false,
        message: "Session invalid",
      });
    }

    // 5. Find logged-in user
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Session invalid",
      });
    }

    // 6. Invalidate tokens issued before password change
    if (user.passwordChangedAt) {
      const passwordChangedTime =
        new Date(user.passwordChangedAt).getTime();

      const tokenIssuedTime = payload.iat * 1000;

      if (
        Number.isFinite(passwordChangedTime) &&
        tokenIssuedTime < passwordChangedTime - 1000
      ) {
        return res.status(401).json({
          success: false,
          message: "Please log in again",
        });
      }
    }

    // 7. Attach authenticated user
    req.user = user;

    return next();
  } catch (error) {
    // Database and unexpected errors should reach
    // the application's global error handler.
    return next(error);
  }
}

// ==========================================
// ROLE-BASED AUTHORIZATION
// ==========================================

const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please log in",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return next();
  };
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  requireAuth,
  allowRoles,
};
