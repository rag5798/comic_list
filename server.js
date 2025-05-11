const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

const app = express();

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const refreshRoutes = require('./routes/refresh');
const comicsRoutes = require('./routes/comics');

app.use('/api/auth', authRoutes);
app.use('/api/auth', refreshRoutes);
app.use('/api/volume', comicsRoutes);

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
  });
