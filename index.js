require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
require('./src/jobs/agenda');

const { errorHandler } = require('./src/middleware/errorhandler');
const { verifyToken } = require('./src/middleware/verifyToken');

const userRoutes = require('./src/routes/userRoutes');
const carRoutes = require('./src/routes/carRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const stripeRoutes = require('./src/routes/stripeRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');

const emailService = require('./src/services/emailService');

const app = express();

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => {
    console.error(" MongoDB connection error:", err.message);
    process.exit(1); 
  });

emailService.testConnection();

app.use(cookieParser());
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/test-auth', verifyToken, (req, res) => {
  res.json({ message: 'Auth passed', user: req.user });
});

app.use('/api/users', userRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/webhooks', webhookRoutes);

app.get('/', (req, res) => {
  res.send('🚀 User Login & Car API is running on Railway!');
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log(" SIGTERM received, shutting down gracefully");
  process.exit(0);
});