require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { authenticate } = require('./middleware/verifytoken');
const app = express();
const port = process.env.PORT || 5000;

connectDB();

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins (adjust in production)
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/test-auth', authenticate, (req, res) => {
  res.json({ message: 'Auth passed', user: req.user });
});

app.get('/protected', authenticate, (req, res) => {
  res.send('Welcome to the User Login API');
});

const userRoutes = require('./routes/userroutes');
const carRoutes = require('./routes/carroutes');

app.use('/api/users', userRoutes);
app.use('/api/cars', carRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
