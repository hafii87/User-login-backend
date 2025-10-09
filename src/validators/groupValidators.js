const Joi = require('joi');
const { AppError } = require('../middleware/errorhandler');

const groupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional(),
  privacy: Joi.string().valid('public', 'private', 'invite-only').optional(),
  preferences: Joi.object().optional(),
  rules: Joi.object().optional()
});

const memberSchema = Joi.object({
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  role: Joi.string().valid('admin', 'member').optional()
});

const carSchema = Joi.object({
  carId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  allowPrivateBooking: Joi.boolean().optional()
});

const groupBookingSchema = Joi.object({
  carId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  groupId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().required().greater(Joi.ref('startTime')),
  timezone: Joi.string().required(),
  bookingType: Joi.string().valid('business', 'private').optional()
});

const validateGroup = (req, res, next) => {
  const { error } = groupSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details.map(d => d.message).join(', '), 400));
  }
  next();
};

const validateGroupMember = (req, res, next) => {
  const { error } = memberSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details.map(d => d.message).join(', '), 400));
  }
  next();
};

const validateGroupCar = (req, res, next) => {
  const { error } = carSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details.map(d => d.message).join(', '), 400));
  }
  next();
};

const validateGroupBooking = (req, res, next) => {
  const { error } = groupBookingSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details.map(d => d.message).join(', '), 400));
  }

  const { startTime, endTime } = req.body;
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start <= now) {
    return next(new AppError('Start time must be in the future', 400));
  }

  const durationMs = end - start;
  if (durationMs < 30 * 60 * 1000) {
    return next(new AppError('Booking duration must be at least 30 minutes', 400));
  }

  if (durationMs > 7 * 24 * 60 * 60 * 1000) {
    return next(new AppError('Booking duration cannot exceed 7 days', 400));
  }
  
  next();
};

module.exports = {
  groupSchema,
  memberSchema,
  carSchema,
  validateGroup,
  validateGroupMember,
  validateGroupCar,
  groupBookingSchema,
  validateGroupBooking
};