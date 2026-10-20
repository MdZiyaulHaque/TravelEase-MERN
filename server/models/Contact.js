const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  subject: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
  message: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
  status: { type: String, enum: ['new', 'read', 'resolved'], default: 'new' },
}, { timestamps: true });

module.exports = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
