const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  refreshToken: { type: String },
  refreshTokenExpiresAt: { type: Date },
  comicCollections: {
    type: Map,
    of: [Object], // Array of issue objects
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
