const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/Users');

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    console.log('[REFRESH] Incoming refresh request');

    if (!refreshToken?.trim()) {
        console.warn('[REFRESH] Missing refresh token in request body');
        return res.status(401).json({ error: 'Missing token' });
    }

    try {
        console.log('[REFRESH] Verifying refresh token...');
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        console.log('[REFRESH] Token decoded:', decoded);

        const user = await User.findById(decoded.userId);
        if (!user) {
            console.warn('[REFRESH] User not found for ID:', decoded.userId);
            return res.status(401).json({ error: 'User not found' });
        }

        console.log('[REFRESH] Found user:', user.email);

        if (user.refreshToken !== refreshToken) {
            console.warn('[REFRESH] Refresh token mismatch for user:', user.email);
            return res.status(401).json({ error: 'Token mismatch' });
        }

        if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
            console.warn('[REFRESH] Refresh token expired for user:', user.email);
            return res.status(401).json({ error: 'Refresh token expired' });
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
        console.log('[REFRESH] Issued new refresh token');

        const newAccessToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        console.log('[REFRESH] Issued new access token');

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user: { email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('[REFRESH] Token verification failed:', err.message);
        res.status(401).json({ error: 'Token verification failed' });
    }
});
  
module.exports = router;