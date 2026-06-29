require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connectDB } = require('./utils/db');
const authRoutes   = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',    authRoutes);
app.use('/api/courses', courseRoutes);

// Base route for status verification
app.get('/status', (req, res) => {
  res.json({ status: 'ok', message: 'Interview Mastery LMS API is active' });
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack);
  res.status(500).json({ message: 'Something went wrong on the server!' });
});

// Connect to MongoDB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[LMS Server] Running on http://localhost:${PORT}`);
  });
});
