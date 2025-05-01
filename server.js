const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json())

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.listen(dotenv.PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});