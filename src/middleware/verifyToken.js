const jwt = require('jsonwebtoken');
const { AppError } = require('./errorhandler');
const User = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      timezone: user.timezone
    };

    next();
  } catch (error) {
    return next(new AppError('Invalid or expired token', 401));
  }
};

module.exports = { verifyToken };   
