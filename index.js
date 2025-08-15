
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
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/test-auth', authenticate, (req, res) => {
  res.json({ message: 'Auth passed', user: req.user });
});

const userRoutes = require('./src/routes/userRoutes');
const carRoutes = require('./src/routes/carRoutes');

app.use('/api/users', userRoutes);
app.use('/api/cars', carRoutes);

app.get('/', (req, res) => {
  res.send('User Login & Car API is running!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
