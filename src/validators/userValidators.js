const Joi = require('joi');
const { AppError } = require('../middleware/errorhandler'); 

const registerSchema = Joi.object({
  username: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^\+92\d{10}$/).required().messages({
    'string.pattern.base': 'Phone number must be in format +92xxxxxxxxxx',
    'any.required': 'Phone number is required'
  }),
  drivingLicenseNumber: Joi.string().min(8).max(15).required().messages({
    'string.min': 'Driving license must be at least 8 characters',
    'string.max': 'Driving license cannot exceed 15 characters',
    'any.required': 'Driving license number is required'
  }),
  dateOfBirth: Joi.date().max('2005-12-31').required().messages({
    'date.max': 'Must be at least 18 years old',
    'any.required': 'Date of birth is required'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const updateProfileSchema = Joi.object({
  username: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  phone: Joi.string().pattern(/^\+92\d{10}$/).optional(),
  drivingLicenseNumber: Joi.string().min(8).max(15).optional()
});

const validate = (schema) => (req, res, next) => {
  if (req.body.username) req.body.username = req.body.username.trim();
  if (req.body.email) req.body.email = req.body.email.trim().toLowerCase();
  if (req.body.password) req.body.password = req.body.password.trim();
  if (req.body.phone) req.body.phone = req.body.phone.trim();
  if (req.body.drivingLicenseNumber) req.body.drivingLicenseNumber = req.body.drivingLicenseNumber.trim();

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(new AppError(error.details.map(d => d.message).join(', '), 400));
  }
  next();
};

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  validate
};
