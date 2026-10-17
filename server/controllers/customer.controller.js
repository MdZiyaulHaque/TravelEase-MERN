
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const User = require("../models/User");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

// Indian mobile number:
// Exactly 10 digits, starting with 6, 7, 8 or 9.
const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^[6-9]\d{9}$/,
    "Enter a valid 10-digit Indian mobile number"
  );

const fields = {
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  address: z.string().trim().max(300),
  city: z.string().trim().max(80),
  country: z.string().trim().max(80),
};

// All fields optional when updating.
// But if phone is supplied, it must be valid.
const updateSchema = z.object(fields).partial().strict();

// Customer creation schema
const createSchema = z
  .object({
    name: fields.name,

    email: z
      .string()
      .trim()
      .email()
      .max(254),

    password: z
      .string()
      .min(8)
      .max(72)
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number"),

    phone: phoneSchema,

    address: fields.address.optional(),
    city: fields.city.optional(),
    country: fields.country.optional(),
  })
  .strict();

const statusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

// ==========================================
// HELPERS
// ==========================================

const safe = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  city: user.city,
  country: user.country,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

function parse(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    const error = new Error(
      result.error.issues[0]?.message || "Validation failed"
    );

    error.status = 400;
    throw error;
  }

  return result.data;
}

function validId(req, res) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    res.status(400).json({
      success: false,
      message: "Invalid customer ID",
    });

    return false;
  }

  return true;
}

// Escape special characters in search text.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==========================================
// GET ALL CUSTOMERS
// GET /api/customers
// ==========================================

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(
      1,
      Math.min(
        100000,
        Number.parseInt(req.query.page, 10) || 1
      )
    );

    const limit = Math.max(
      1,
      Math.min(
        50,
        Number.parseInt(req.query.limit, 10) || 10
      )
    );

    const search = String(req.query.search || "")
      .trim()
      .slice(0, 100);

    const filter = {
      role: "customer",
    };

    if (search) {
      const escaped = escapeRegex(search);

      filter.$or = [
        {
          name: {
            $regex: escaped,
            $options: "i",
          },
        },
        {
          email: {
            $regex: escaped,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: escaped,
            $options: "i",
          },
        },
      ];
    }

    if (req.query.status === "active") {
      filter.isActive = true;
    }

    if (req.query.status === "inactive") {
      filter.isActive = false;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      customers: users.map(safe),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CUSTOMER STATISTICS
// GET /api/customers/stats
// ==========================================

exports.stats = async (req, res, next) => {
  try {
    const [total, active] = await Promise.all([
      User.countDocuments({
        role: "customer",
      }),

      User.countDocuments({
        role: "customer",
        isActive: true,
      }),
    ]);

    return res.json({
      success: true,
      stats: {
        total,
        active,
        inactive: total - active,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SINGLE CUSTOMER
// GET /api/customers/:id
// ==========================================

exports.getOne = async (req, res, next) => {
  try {
    if (!validId(req, res)) return;

    const user = await User.findOne({
      _id: req.params.id,
      role: "customer",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.json({
      success: true,
      customer: safe(user),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CREATE CUSTOMER
// POST /api/customers
// ==========================================

exports.create = async (req, res, next) => {
  try {
    const data = parse(createSchema, req.body);

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
      ...data,
      email,
      password: undefined,
      passwordHash,
      role: "customer",
    });

    return res.status(201).json({
      success: true,
      customer: safe(user),
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
// UPDATE CUSTOMER
// PATCH /api/customers/:id
// ==========================================

exports.update = async (req, res, next) => {
  try {
    if (!validId(req, res)) return;

    const data = parse(updateSchema, req.body);

    if (!Object.keys(data).length) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "customer",
      },
      {
        $set: data,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.json({
      success: true,
      customer: safe(user),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ACTIVATE / DEACTIVATE CUSTOMER
// PATCH /api/customers/:id/status
// ==========================================

exports.setStatus = async (req, res, next) => {
  try {
    if (!validId(req, res)) return;

    const data = parse(statusSchema, req.body);

    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "customer",
      },
      {
        $set: data,
      },
      {
        new: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.json({
      success: true,
      customer: safe(user),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET LOGGED-IN CUSTOMER PROFILE
// ==========================================

exports.profile = (req, res) => {
  return res.json({
    success: true,
    customer: safe(req.user),
  });
};

// ==========================================
// UPDATE LOGGED-IN CUSTOMER PROFILE
// ==========================================

exports.updateProfile = async (req, res, next) => {
  try {
    const data = parse(updateSchema, req.body);

    if (!Object.keys(data).length) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: data,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.json({
      success: true,
      customer: safe(user),
    });
  } catch (error) {
    next(error);
  }
};
