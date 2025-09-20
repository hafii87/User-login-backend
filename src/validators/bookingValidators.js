const Joi = require('joi');
const { AppError } = require('../middleware/errorhandler');

const bookingSchema = Joi.object({
  carId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Car ID is required',
      'string.empty': 'Car ID cannot be empty',
      'string.pattern.base': 'Car ID must be a valid ObjectId'
    }),

     groupId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Group ID must be a valid ObjectId'
    }),

  startTime: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Start time is required',
      'date.base': 'Start time must be a valid date',
      'date.format': 'Start time must be in ISO format'
    }),

  endTime: Joi.date()
    .iso()
    .required()
    .greater(Joi.ref('startTime'))
    .messages({
      'any.required': 'End time is required',
      'date.base': 'End time must be a valid date',
      'date.format': 'End time must be in ISO format',
      'date.greater': 'End time must be after start time'
    }),

  timezone: Joi.string()
    .required()
    .messages({
      'any.required': 'Timezone is required',
      'string.empty': 'Timezone cannot be empty',
      'string.valid': 'Timezone must be either UTC or local'
    })
});

const extendingBookingSchema = Joi.object({
  newEndTime: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'New end time is required',
      'date.base': 'New end time must be a valid date',
      'date.format': 'New end time must be in ISO format'
    })
});

const validateBooking = (req, res, next) => {
  const { error } = bookingSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const message = error.details.map(d => d.message).join(', ');
    return next(new AppError(message, 400));
  }

  const { startTime, endTime } = req.body;
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start <= now) {
    return next(new AppError('Start time must be in the future', 400));
  }

  const durationMs = end - start;
  const halfHourMs = 30 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  if (durationMs < halfHourMs) {
    return next(new AppError('Booking duration must be at least 30 minutes', 400));
  }

  if (durationMs > sevenDaysMs) {
    return next(new AppError('Booking duration cannot exceed 7 days', 400));
  }

  next();
};

const validateExtendingBooking = (req, res, next) => {
  const { error } = extendingBookingSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const message = error.details.map(d => d.message).join(', ');
    return next(new AppError(message, 400));
  }

  next();
};

module.exports = {
  validateBooking,
  bookingSchema,
  validateExtendingBooking,
  extendingBookingSchema
};
