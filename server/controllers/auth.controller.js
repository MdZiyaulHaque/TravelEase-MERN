
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { z } = require("zod");

const User = require("../models/User");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[A-Z]/, "Add uppercase letter")
  .regex(/[a-z]/, "Add lowercase letter")
  .regex(/[0-9]/, "Add number");

const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^[6-9]\d{9}$/,
    "Enter a valid 10-digit Indian mobile number"
  );

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),

  email: z.string().trim().email().max(254),

  password: passwordSchema,

  phone: z
    .union([phoneSchema, z.literal("")])
    .optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const resetSchema = z.object({
  token: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "Invalid reset token"),

  password: passwordSchema,
});

// ==========================================
// HELPERS
// ==========================================

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
});

// ==========================================
// PRODUCTION COOKIE CONFIGURATION
// ==========================================

const isProduction = () =>
  process.env.NODE_ENV === "production";

const cookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? "none" : "lax",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
});

const clearSession = (res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? "none" : "lax",
    path: "/",
  });
};

const setSession = (res, user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    {
      sub: user.id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
      algorithm: "HS256",
    }
  );

  res.cookie(
    "access_token",
    token,
    cookieOptions()
  );
};

// ==========================================
// VALIDATION HELPER
// ==========================================

const validation = (schema, body) => {
  const result = schema.safeParse(body);

  if (!result.success) {
    const error = new Error(
      result.error.issues[0]?.message ||
      "Validation failed"
    );

    error.status = 400;
    throw error;
  }

  return result.data;
};

// ==========================================
// REGISTER
// ==========================================

exports.register = async (req, res, next) => {
  try {
    const data = validation(
      registerSchema,
      req.body
    );

    const email = data.email.toLowerCase();

    const existingUser = await User.exists({
      email,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const passwordHash = await bcrypt.hash(
      data.password,
      12
    );

    const user = await User.create({
      name: data.name,
      email,
      phone: data.phone || "",
      passwordHash,
      role: "customer",
    });

    setSession(res, user);

    return res.status(201).json({
      success: true,
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    next(error);
  }
};

// ==========================================
// LOGIN
// ==========================================

exports.login = async (req, res, next) => {
  try {
    const data = validation(
      loginSchema,
      req.body
    );

    const user = await User.findOne({
      email: data.email.toLowerCase(),
    }).select("+passwordHash");

    if (
      !user ||
      !user.isActive ||
      !user.passwordHash ||
      !(await bcrypt.compare(
        data.password,
        user.passwordHash
      ))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    setSession(res, user);

    return res.json({
      success: true,
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CURRENT USER
// ==========================================

exports.me = (req, res) => {
  return res.json({
    success: true,
    user: publicUser(req.user),
  });
};

// ==========================================
// LOGOUT
// ==========================================

exports.logout = (req, res) => {
  clearSession(res);

  return res.json({
    success: true,
    message: "Logged out",
  });
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

exports.forgotPassword = async (
  req,
  res,
  next
) => {
  try {
    const emailResult = z
      .string()
      .trim()
      .email()
      .safeParse(req.body?.email);

    if (!emailResult.success) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email",
      });
    }

    const email = emailResult.data.toLowerCase();

    const user = await User.findOne({
      email,
    });

    if (user && user.isActive) {
      const token = crypto
        .randomBytes(32)
        .toString("hex");

      const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      user.resetTokenHash = tokenHash;

      user.resetTokenExpiresAt = new Date(
        Date.now() + 15 * 60 * 1000
      );

      await user.save();

      const clientUrl = (
        process.env.CLIENT_URL ||
        "http://localhost:5173"
      ).replace(/\/+$/, "");

      const link =
        `${clientUrl}/reset-password?token=${token}`;

      if (
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
      ) {
        const smtpPort = Number(
          process.env.SMTP_PORT || 587
        );

        const transport =
          nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

        await transport.sendMail({
          from:
            process.env.SMTP_FROM ||
            process.env.SMTP_USER,

          to: user.email,

          subject:
            "TravelEase password reset",

          text:
            "Reset your password using this link " +
            "(expires in 15 minutes):\n\n" +
            link,
        });
      } else if (!isProduction()) {
        console.log(
          "DEV ONLY reset URL:",
          link
        );
      } else {
        console.error(
          "SMTP not configured: password reset email not sent"
        );
      }
    }

    return res.json({
      success: true,
      message:
        "If that email is registered, a reset link will be sent.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================

exports.resetPassword = async (
  req,
  res,
  next
) => {
  try {
    const data = validation(
      resetSchema,
      req.body
    );

    const hash = crypto
      .createHash("sha256")
      .update(data.token)
      .digest("hex");

    const user = await User.findOne({
      resetTokenHash: hash,
      resetTokenExpiresAt: {
        $gt: new Date(),
      },
    }).select(
      "+resetTokenHash +resetTokenExpiresAt"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Reset link is invalid or expired",
      });
    }

    user.passwordHash = await bcrypt.hash(
      data.password,
      12
    );

    user.resetTokenHash = undefined;
    user.resetTokenExpiresAt = undefined;
    user.passwordChangedAt = new Date();

    await user.save();

    clearSession(res);

    return res.json({
      success: true,
      message:
        "Password updated. Please log in.",
    });
  } catch (error) {
    next(error);
  }
};
