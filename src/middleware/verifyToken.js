const jwt = require('jsonwebtoken');
const { AppError } = require('./errorhandler');
const User = require('../models/UserModel');

const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    console.log('Auth Header:', authHeader); 
    console.log('Token:', token); 
    if (!token) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', decoded);

    const userId = decoded.id || decoded._id;
    console.log('User ID from token:', userId); 
    
    if (!userId) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid token payload' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'User not found' 
      });
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(), 
      username: user.username,
      email: user.email
    };

    console.log('req.user set to:', req.user); 

    next();
  } catch (error) {
    console.error('Token verification error:', error); 
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Token expired' 
      });
    }

    return res.status(500).json({ 
      status: 'error', 
      message: 'Token verification failed' 
    });
  }
};

module.exports = verifyToken;