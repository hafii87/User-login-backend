const Joi = require('joi');
const { AppError } = require('../middleware/errorhandler');

const carSchema = Joi.object({
  make: Joi.string().min(2).max(100).required().messages({
    'string.base': 'Car make must be a string',
    'string.empty': 'Car make cannot be empty',
    'string.min': 'Car make must be at least 2 characters long',
    'string.max': 'Car make cannot exceed 100 characters',
    'any.required': 'Car make is required'
  }),

  model: Joi.string().min(2).max(100).required().messages({
    'string.base': 'Car model must be a string',
    'string.empty': 'Car model cannot be empty',
    'string.min': 'Car model must be at least 2 characters long',
    'string.max': 'Car model cannot exceed 100 characters',
    'any.required': 'Car model is required'
  }),

  year: Joi.number()
    .integer()
    .min(1886)
    .max(new Date().getFullYear() + 1)
    .required()
    .messages({
      'number.base': 'Year must be a number',
      'number.min': 'Year must be at least 1886',
      'number.max': `Year cannot exceed ${new Date().getFullYear() + 1}`,
      'any.required': 'Year is required'
    }),

  price: Joi.number().min(0).required().messages({
    'number.base': 'Price must be a number',
    'number.min': 'Price cannot be negative',
    'any.required': 'Price is required'
  }),
  
  licenseNumber: Joi.string().min(3).max(20).required().messages({
    'string.base': 'License number must be a string',
    'string.empty': 'License number cannot be empty',
    'string.min': 'License number must be at least 3 characters',
    'string.max': 'License number cannot exceed 20 characters',
    'any.required': 'License number is required'
  })
});

const validateCar = (req, res, next) => {
  const { error } = carSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(
      new AppError(
        error.details.map((d) => d.message).join(', '),
        400
      )
    );
  }
  next();
};

module.exports = {
  carSchema,
  validateCar
};
