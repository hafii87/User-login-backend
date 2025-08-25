const Joi = require('joi');
const { AppError } = require('../middleware/errorhandler');

const bookingSchema = Joi.object({
  userId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'User ID is required',
      'string.empty': 'User ID cannot be empty',
      'string.pattern.base': 'User ID must be a valid ObjectId'
    }),

  carId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Car ID is required',
      'string.empty': 'Car ID cannot be empty',
      'string.pattern.base': 'Car ID must be a valid ObjectId'
    }),

  startTime: Joi.date()
    .required()
    .messages({
      'any.required': 'Start time is required',
      'date.base': 'Start time must be a valid date'
    }),

  endTime: Joi.date()
    .required()
    .greater(Joi.ref('startTime'))
    .messages({
      'any.required': 'End time is required',
      'date.base': 'End time must be a valid date',
      'date.greater': 'End time must be after start time'
    })
});

const validateBooking = (req, res, next) => {
  const { error } = bookingSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const message = error.details.map(d => d.message).join(', ');
    return next(new AppError(message, 400));
  }

  next();
};

module.exports = { validateBooking, bookingSchema };
