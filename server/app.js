
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const crypto = require("node:crypto");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();

const isProduction = process.env.NODE_ENV === "production";

const clientOrigin = (
  process.env.CLIENT_URL || "http://localhost:5173"
).trim().replace(/\/+$/, "");

// Production must use an explicit HTTPS frontend URL.
if (
  isProduction &&
  (!process.env.CLIENT_URL ||
    !clientOrigin.startsWith("https://"))
) {
  throw new Error(
    "Production CLIENT_URL must be configured with the HTTPS frontend origin"
  );
}

app.disable("x-powered-by");

// Render runs behind a trusted reverse proxy.
// Required for accurate client IPs and rate limiting.
if (isProduction) {
  app.set("trust proxy", 1);
}

// ========================================
// SECURITY HEADERS
// ========================================

app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();

  res.set("X-Request-Id", req.requestId);
  res.set("X-Content-Type-Options", "nosniff");
  res.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );
  res.set("X-Frame-Options", "DENY");
  res.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  next();
});

// ========================================
// CORS
// ========================================

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// ========================================
// PAYMENT WEBHOOK
// Preserve the exact raw request body for
// Razorpay signature verification.
// ========================================

app.post(
  "/api/payments/webhook",
  express.raw({
    type: "application/json",
    limit: "256kb",
  }),
  require("./routes/payment.routes").webhook
);

// ========================================
// BODY PARSING
// ========================================

app.use(
  express.json({
    limit: "20kb",
  })
);

app.use(cookieParser());

// ========================================
// CSRF / ORIGIN PROTECTION
// ========================================

const unsafeMethods = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

app.use((req, res, next) => {
  if (!unsafeMethods.has(req.method)) {
    return next();
  }

  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");

  // If an Origin header exists, it must match
  // the configured frontend exactly.
  if (origin && origin !== clientOrigin) {
    return res.status(403).json({
      success: false,
      message: "Origin not allowed",
    });
  }

  // Cross-site requests from our own Vercel
  // frontend are allowed when Origin matches.
  // Other cross-site requests are rejected.
  if (
    fetchSite === "cross-site" &&
    origin !== clientOrigin
  ) {
    return res.status(403).json({
      success: false,
      message: "Cross-site request blocked",
    });
  }

  // Authenticated browser requests must provide
  // the exact permitted frontend Origin.
  if (
    req.cookies?.access_token &&
    fetchSite &&
    origin !== clientOrigin
  ) {
    return res.status(403).json({
      success: false,
      message: "Origin required",
    });
  }

  next();
});

// ========================================
// HEALTH ROUTES
// ========================================

app.use(
  "/api",
  require("./routes/health.routes")
);

// ========================================
// AUTH ROUTES
// ========================================

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      message:
        "Too many authentication requests; please retry later",
    },
  }),
  require("./routes/auth.routes")
);

// ========================================
// APPLICATION ROUTES
// ========================================

app.use(
  "/api/customers",
  require("./routes/customer.routes")
);

app.use(
  "/api",
  require("./routes/catalog.routes")
);

app.use(
  "/api/upload",
  require("./routes/upload.routes")
);

app.use(
  "/api/packages",
  require("./routes/itinerary.routes")
);

app.use(
  "/api/resources",
  require("./routes/resources.routes")
);

app.use(
  "/api/bookings",
  require("./routes/booking.routes")
);

app.use(
  "/api/trips",
  require("./routes/trip.routes")
);

app.use(
  "/api/dashboard",
  require("./routes/dashboard.routes")
);

app.use(
  "/api/reports",
  require("./routes/report.routes")
);

app.use(
  "/api/notifications",
  require("./routes/notification.routes")
);

app.use(
  "/api/reviews",
  require("./routes/review.routes")
);

app.use(
  "/api/feedback",
  require("./routes/feedback.routes")
);

app.use(
  "/api/coupons",
  require("./routes/coupon.routes")
);

app.use(
  "/api/payments",
  require("./routes/payment.routes").router
);

// ========================================
// STATIC UPLOADS
// ========================================

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads"),
    {
      maxAge: "1d",
    }
  )
);

// ========================================
// 404 HANDLER
// ========================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {
  console.error(
    `[${req.requestId}]`,
    err
  );

  if (res.headersSent) {
    return next(err);
  }

  const status =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status < 600
      ? err.status
      : 500;

  const message =
    status === 500
      ? "Internal server error"
      : err.message;

  return res.status(status).json({
    success: false,
    message,
    requestId: req.requestId,
  });
});

module.exports = app;
