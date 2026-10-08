const mongoose = require('mongoose');

const vouchSchema = new mongoose.Schema({
  userId: { type: String },
  username: { type: String },
  authorUserId: { type: String },
  authorUser: { type: String },
  targetUserId: { type: String },
  targetUser: { type: String },
  message: { type: String, required: true },
  proofUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Vouch', vouchSchema);
