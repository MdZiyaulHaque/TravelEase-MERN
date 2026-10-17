
const router = require("express").Router();
const rateLimit = require("express-rate-limit");

const auth = require("../controllers/auth.controller");

const {
  requireAuth,
  allowRoles,
} = require("../middleware/auth");

// ==========================================
// RATE LIMIT HELPER
// ==========================================

const createLimiter = (maxRequests) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,

    limit: maxRequests,

    standardHeaders: "draft-7",
    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many attempts. Try again after 15 minutes.",
    },
  });

// ==========================================
// SEPARATE API LIMITERS
// ==========================================

// Register: 5 requests / 15 minutes
const registerLimiter = createLimiter(5);

// Login: 10 requests / 15 minutes
const loginLimiter = createLimiter(10);

// Forgot password: 5 requests / 15 minutes
const forgotPasswordLimiter = createLimiter(5);

// Reset password: 5 requests / 15 minutes
const resetPasswordLimiter = createLimiter(5);

// ==========================================
// PUBLIC AUTH ROUTES
// ==========================================

router.post(
  "/register",
  registerLimiter,
  auth.register
);

router.post(
  "/login",
  loginLimiter,
  auth.login
);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  auth.forgotPassword
);

router.post(
  "/reset-password",
  resetPasswordLimiter,
  auth.resetPassword
);

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

router.post(
  "/logout",
  requireAuth,
  auth.logout
);

router.get(
  "/me",
  requireAuth,
  auth.me
);

// ==========================================
// ROLE PROTECTED ROUTES
// ==========================================

router.get(
  "/admin-only",
  requireAuth,
  allowRoles("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin",
    });
  }
);

router.get(
  "/vendor-only",
  requireAuth,
  allowRoles("vendor"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Vendor",
    });
  }
);

module.exports = router;
