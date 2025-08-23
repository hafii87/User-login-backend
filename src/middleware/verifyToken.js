const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("Auth header:", authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided or malformed token' });
    }

    const token = authHeader.split(' ')[1];
    console.log("Token:", token);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);
    } catch (err) {
      console.error("JWT verification failed:", err.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const userId = decoded._id || decoded.id;
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token: no user ID' });
    }

    const user = await User.findById(userId).select('-password');
    console.log("User from DB:", user);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token: user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

module.exports = authenticate;
