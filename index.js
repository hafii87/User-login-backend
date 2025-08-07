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

app.get('/protected', (req, res) => {
  res.send('Welcome to the User Login API');
});

const userRoutes = require('./routes/userroutes');
app.use('/api/users', userRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
