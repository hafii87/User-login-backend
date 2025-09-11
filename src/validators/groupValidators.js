const Joi = require('joi');
const { AppError } = require('../middleware/errorhandler');

const groupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.base': 'Group name must be a string',
    'string.empty': 'Group name cannot be empty',
    'string.min': 'Group name must be at least 2 characters',
    'string.max': 'Group name cannot exceed 100 characters',
    'any.required': 'Group name is required'
  }),

  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description cannot exceed 500 characters'
  }),

  privacy: Joi.string().valid('public', 'private', 'invite-only').optional(),

  preferences: Joi.object({
    maxBookingDuration: Joi.number().min(1).optional(),
    advanceBookingLimit: Joi.number().min(1).optional(),
    autoApproveBookings: Joi.boolean().optional(),
    allowMemberInvites: Joi.boolean().optional(),
    bookingCancellationPolicy: Joi.string().valid('flexible', 'moderate', 'strict').optional()
  }).optional(),

  rules: Joi.object({
    emailVerified: Joi.boolean().optional(),
    phoneVerified: Joi.boolean().optional(),
    licenseRequired: Joi.boolean().optional(),
    minimumAge: Joi.number().min(16).max(100).optional(),
    backgroundCheckRequired: Joi.boolean().optional()
  }).optional()
});

const memberSchema = Joi.object({
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'any.required': 'User ID is required',
    'string.pattern.base': 'User ID must be a valid ObjectId'
  }),
  role: Joi.string().valid('admin', 'member').optional()
});

const carSchema = Joi.object({
  carId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'any.required': 'Car ID is required',
    'string.pattern.base': 'Car ID must be a valid ObjectId'
  })
});

const validateGroup = (req, res, next) => {
  const { error } = groupSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(new AppError(
      error.details.map(d => d.message).join(', '),
      400
    ));
  }
  next();
};

const validateGroupMember = (req, res, next) => {
  const { error } = memberSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(new AppError(
      error.details.map(d => d.message).join(', '),
      400
    ));
  }
  next();
};

const validateGroupCar = (req, res, next) => {
  const { error } = carSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(new AppError(
      error.details.map(d => d.message).join(', '),
      400
    ));
  }
  next();
};

module.exports = {
  groupSchema,
  memberSchema,
  carSchema,
  validateGroup,
  validateGroupMember,
  validateGroupCar
};