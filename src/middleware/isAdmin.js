const { AppError } = require('./errorhandler');

const isAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin privileges required.', 403));
  }
  next();
};

module.exports = isAdmin;

