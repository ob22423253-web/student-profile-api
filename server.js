/**
 * Student Profile Management API
 * Author: Ousman Bah
 * Matric: 22423253
 * Email: ob22423253@utg.edu.gm
 * Express Backend Assignment
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const mongoose = require('mongoose');

const studentRoutes = require('./routes/studentRoutes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const swaggerSpec = require('./docs/swagger');
const { connectDB } = require('./config/db');

const app = express();

app.set('trust proxy', 1);

// CSP disabled so Swagger UI's inline scripts and styles can load.
// Acceptable here because this is an internal API + docs surface, not a public website.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());
app.use(xss());

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests from this IP. Try again in 15 minutes.',
      statusCode: 429
    }
  }
});
app.use('/api/', apiLimiter);

// Top-level health route (NOT under /api) — Render's health checks hit /health.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'Student Profile API',
    version: '1.0.0',
    links: {
      docs: '/api/docs',
      students: '/api/students',
      author: '/api/author',
      health: '/health'
    }
  });
});

app.get('/api/author', (req, res) => {
  res.json({
    name: 'Ousman Bah',
    matric: '22423253',
    email: 'ob22423253@utg.edu.gm',
    project: 'Student Profile API'
  });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/students', studentRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
