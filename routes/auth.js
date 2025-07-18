const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const auth = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed });

  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign({ userId: user._id }, JWT_SECRET, {
    expiresIn: "30d",
  });

  user.refreshToken = refreshToken;
  user.refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await user.save();

  console.log("Issued tokens:", { accessToken, refreshToken });
  res.status(201).json({
    accessToken,
    refreshToken,
    user: { email: user.email, role: user.role },
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(403).json({ error: "User not found" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign({ userId: user._id }, JWT_SECRET, {
    expiresIn: "30d",
  });

  user.refreshToken = refreshToken;
  user.refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await user.save();

  res.json({
    accessToken,
    refreshToken,
    user: { email: user.email, role: user.role },
  });
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  user.refreshToken = null;
  user.refreshTokenExpiresAt = null;
  await user.save();

  res.json({ message: "Logged out successfully" });
});

// POST /api/auth/change-email
router.post("/change-email", auth, async (req, res) => {
  const { email } = req.body;
  const userId = req.user.userId

  if (!email || !userId) {
    return res.status(400).json({ error: "Missing email or userId" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  user.email = email;
  await user.save();

  res.json({ message: `Email changed to: ${email}` });
});

// POST /api/auth/change-password
router.post("/change-password", auth, async (req, res) => {
  const { password } = req.body;
  const userId = req.user.userId;

  if (!password || !userId) {
    return res.status(400).json({ error: "Missing password or userId" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Hash the new password securely
  const bcrypt = require("bcryptjs");
  const hashedPassword = await bcrypt.hash(password, 10);

  user.password = hashedPassword;
  await user.save();

  res.json({ message: "Password updated successfully." });
});

module.exports = router;
