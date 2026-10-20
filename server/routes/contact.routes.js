const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const Contact = require('../models/Contact');
const { requireAuth, allowRoles } = require('../middleware/auth');

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(5000),
}).strict();

router.post('/', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many enquiries. Please try again later.' },
}), async (req, res, next) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
    }
    await Contact.create(parsed.data);
    return res.status(201).json({ success: true, message: 'Your enquiry has been received successfully.' });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, allowRoles('admin'), async (req, res, next) => {
  try {
    const data = await Contact.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
