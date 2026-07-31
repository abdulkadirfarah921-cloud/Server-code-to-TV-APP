require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

    const authRoutes = require('./auth')
const adminRoutes = require('./routes/admin');
const { apiLimiter } = require('./middleware/rateLimit');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.REACT_APP_API_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health
app.get('/api/health', (req, res) => res.json({ status: 'TITAN PANEL ONLINE', time: new Date() }));

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`TITAN PANEL Server running at http://localhost:${PORT}`));
