const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Route imports
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Basic health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'ExpenseFlow API is running' });
});

app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'ExpenseFlow API is running' });
});

// API Routes (mount on both /api/* and /* for full Vercel rewrite compatibility)
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/settings', settingsRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;
