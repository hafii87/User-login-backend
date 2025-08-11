require('dotenv').config();
const express = require('express');
const path = require('path');
const port = 5000;

const connectDB = require('./config/db');
const app = express();
connectDB();

const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(express.json());

app.use(( req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/protected', (req, res) => {
  res.send('Welcome to the User Login API');
});

const userRoutes = require('./routes/userroutes');
app.use('/api/users', userRoutes);

const carRoutes = require('./routes/carroutes');
app.use('/api/cars', carRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
