import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import dashboard from './routes/dashboard.js';
import performance from './routes/performance.js';
import ai from './routes/ai.js';
import news from './routes/news.js';
import users from './routes/users.js';

const app = express();

// 1. Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 4820;
const basePath = "/fin/api";

// === ROUTES ===
// Dashboard data routes
app.use(`${basePath}/dashboard-data`, dashboard);

// Performance views routes
app.use(`${basePath}/performance-views`, performance);

// AI Assistant routes
app.use(`${basePath}/ai`, ai);

// Live News routes
app.use(`${basePath}/news`, news);

// User routes
app.use(`${basePath}/user`, users);

// Health check route
app.get(`${basePath}/health`, (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000
})
  .then(async () => {
    console.log('Connected to MongoDB');

    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Handle MongoDB connection errors
mongoose.connection.on('error', error => {
  console.error('MongoDB error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

export default app;
