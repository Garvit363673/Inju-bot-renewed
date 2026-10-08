const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  guildId:     { type: String, required: true },
  channelId:   { type: String, required: true },
  messageId:   { type: String, index: true },
  hostId:      { type: String, required: true },
  prize:       { type: String, required: true },
  winnerCount: { type: Number, default: 1 },
  imageUrl:    { type: String },
  endsAt:      { type: Date, required: true, index: true },
  endedAt:     { type: Date },
  ended:       { type: Boolean, default: false, index: true },
  entries:     { type: [String], default: [] },
  winners:     { type: [String], default: [] },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Giveaway', giveawaySchema);
