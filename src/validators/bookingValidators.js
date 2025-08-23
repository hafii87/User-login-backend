const Joi = require('joi');
const { AppError } = require('../middleware/errorhandler');

const bookingSchema = Joi.object({
  userId: Joi.string().required().messages({
    'any.required': 'User ID is required',
    'string.empty': 'User ID cannot be empty'
  }),
  carId: Joi.string().required().messages({
    'any.required': 'Car ID is required',
    'string.empty': 'Car ID cannot be empty'
  }),
  startDate: Joi.date().required().messages({
    'any.required': 'Start date is required',
    'date.base': 'Start date must be a valid date'
  }),
  endDate: Joi.date().greater(Joi.ref('startDate')).required().messages({
    'any.required': 'End date is required',
    'date.greater': 'End date must be after start date',
    'date.base': 'End date must be a valid date'
  })
});

const validateBooking = (req, res, next) => {
  const { error } = bookingSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(new AppError(error.details.map(d => d.message).join(', '), 400));
  }
  next();
};

module.exports = validateBooking;
