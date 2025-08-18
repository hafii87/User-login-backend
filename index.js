require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { authenticate } = require('./src/middleware/verifyToken');

const app = express();
const port = process.env.PORT || 5000;

connectDB();

app.use(cookieParser());
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/test-auth', authenticate, (req, res) => {
  res.json({ message: 'Auth passed', user: req.user });
});

const userRoutes = require('./src/routes/userRoutes');
const carRoutes = require('./src/routes/carRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');

app.use('/api/users', userRoutes);      
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/', (req, res) => {
  res.send('User Login & Car API is running!');
});

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ success: false, message: err.message });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
