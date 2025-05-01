const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/Users');

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
const { refreshToken } = req.body;
    if (!refreshToken?.trim()) {
        return res.status(401).json({ error: 'Missing token' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(403).json({ error: 'User not found' });
        }

        if (user.refreshToken !== refreshToken) {
            return res.status(403).json({ error: 'Token mismatch' });
        }

        if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
            return res.status(403).json({ error: 'Refresh token expired' });
        }

        const newRefreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
        );
        user.refreshToken = newRefreshToken;
        user.refreshTokenExpiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
        );
        await user.save();

        const newAccessToken = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
        );

        res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        });
    } catch (err) {
        console.error(err);
        res.status(403).json({ error: 'Token verification failed' });
    }
});
  
module.exports = router;