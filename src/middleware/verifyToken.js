const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { AppError } = require('./errorhandler');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ status: 'error', message: 'No token provided or malformed token' });

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }


    const userId = decoded.id; 
    if (!userId) return res.status(401).json({ status: 'error', message: 'Invalid token: no user ID' });

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(401).json({ status: 'error', message: 'Invalid token: user not found' });

    req.user = user; 
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ status: 'error', message: 'Server error during authentication' });
  }
};

module.exports = verifyToken;
