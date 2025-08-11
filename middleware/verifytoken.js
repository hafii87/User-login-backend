const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send('Access Denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(400).send('Invalid Token.');
  }
};

const protect = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.user = decoded;
    next();
  });
};

module.exports = { authenticate, protect };
