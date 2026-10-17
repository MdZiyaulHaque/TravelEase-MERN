
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Resend } = require("resend");
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
  phone: z.union([phoneSchema, z.literal("")]).optional(),
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
    { sub: user.id },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
      algorithm: "HS256",
    }
  );

  res.cookie("access_token", token, cookieOptions());
};

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
// RESEND EMAIL CONFIGURATION
// ==========================================

let resendClient;

function getResendClient() {
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_FROM
  ) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(
      process.env.RESEND_API_KEY
    );
  }

  return resendClient;
}

async function sendPasswordResetEmail(email, link) {
  const resend = getResendClient();

  if (!resend) {
    if (!isProduction()) {
      console.log("DEV ONLY reset URL:", link);
      return;
    }

    throw new Error(
      "Resend email service is not configured"
    );
  }

  const result = await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: [email],
    subject: "TravelEase | Reset Your Password",

    text: [
      "You requested a password reset for TravelEase.",
      "",
      "Open this link to reset your password:",
      link,
      "",
      "This link expires in 15 minutes.",
      "If you did not request this, ignore this email.",
    ].join("\n"),

    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:30px auto;padding:30px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#0f172a">TravelEase</h2>

        <h3 style="color:#1e293b">
          Reset Your Password
        </h3>

        <p style="color:#475569;line-height:1.6">
          We received a request to reset your
          TravelEase account password.
        </p>

        <p style="margin:30px 0">
          <a href="${link}"
             style="background:#2563eb;color:white;padding:14px 24px;text-decoration:none;border-radius:8px;display:inline-block">
            Reset Password
          </a>
        </p>

        <p style="color:#475569">
          This link expires in <b>15 minutes</b>.
        </p>

        <p style="color:#64748b;font-size:13px">
          If you did not request a password reset,
          you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(
      result.error.message ||
        "Failed to send reset email"
    );
  }

  return result.data;
}

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
// FORGOT PASSWORD - RESEND API
// ==========================================

exports.forgotPassword = async (req, res, next) => {
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

    const user = await User.findOne({ email });

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

      try {
        await sendPasswordResetEmail(
          user.email,
          link
        );
      } catch (mailError) {
        // Do not expose email configuration details
        // or account existence to the client.
        console.error(
          "Password reset email failed:",
          mailError.message
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

exports.resetPassword = async (req, res, next) => {
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
