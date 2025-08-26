const Joi = require('joi');
const { AppError } = require('../middleware/errorhandler');

const bookingSchema = Joi.object({
  carId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Car ID is required',
      'string.empty': 'Car ID cannot be empty',
      'string.pattern.base': 'Car ID must be a valid ObjectId'
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
    })
});

const validateBooking = (req, res, next) => {
  const { error } = bookingSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const message = error.details.map(d => d.message).join(', ');
    return next(new AppError(message, 400));
  }


  const { startTime, endTime } = req.body;
  
  if (new Date(startTime) <= new Date()) {
    return next(new AppError('Start time must be in the future', 400));
  }

  const duration = new Date(endTime) - new Date(startTime);
  const oneHour = 60 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  if (duration < oneHour) {
    return next(new AppError('Booking duration must be at least 1 hour', 400));
  }

  if (duration > sevenDays) {
    return next(new AppError('Booking duration cannot exceed 7 days', 400));
  }

  next();
};

module.exports = { validateBooking, bookingSchema };