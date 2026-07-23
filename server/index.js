import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import sequelize from './config/database.js';

import postsRouter from './routes/posts.js';
import uploadRouter from './routes/upload.js';
import { errorHandler } from './middleware/errorHandler.js';

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── Security middleware ── */
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

/* ── Rate limiting ── */
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
}));

/* ── Body parsers ── */
app.use(express.json({ limit: '1mb' }));       // posts are small JSON
app.use(express.urlencoded({ extended: true }));

/* ── Routes ── */
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.use('/api/posts',  postsRouter);
app.use('/api/upload', uploadRouter);

/* ── 404 handler ── */
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

/* ── Global error handler ── */
app.use(errorHandler);

/* ── SQLite connection ── */
async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅  SQLite connected');
    
    // Automatically create tables based on models
    await sequelize.sync({ alter: true });
    console.log('✅  Database synchronized');

    app.listen(PORT, () => {
      console.log(`🚀  Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌  SQLite connection failed:', err.message);
    process.exit(1);
  }
}

start();
