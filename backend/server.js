require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const { connectDB } = require('./utils/db');
const authRoutes    = require('./routes/authRoutes');
const courseRoutes  = require('./routes/courseRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ─────────────────────────────────────────────────────────────────
// Allow localhost in dev + any Vercel deployment of the frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /\.vercel\.app$/,         // matches all *.vercel.app subdomains
  process.env.FRONTEND_URL, // set this on Vercel to your exact frontend URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(o =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );
    allowed
      ? callback(null, true)
      : callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// ── DB connection middleware (works in both serverless and long-lived) ───
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB] Connection error:', err.message);
    res.status(503).json({ message: 'Database unavailable' });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/courses', courseRoutes);

// Health check
app.get('/',       (req, res) => res.json({ status: 'ok', message: 'Interview Mastery LMS API' }));
app.get('/status', (req, res) => res.json({ status: 'ok', message: 'Interview Mastery LMS API is active' }));

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack);
  res.status(500).json({ message: 'Something went wrong on the server!' });
});

// ── Local dev: start server; Vercel: export app ───────────────────────────
if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`[LMS Server] Running on http://localhost:${PORT}`));
  });
}

// Required for Vercel serverless
module.exports = app;
