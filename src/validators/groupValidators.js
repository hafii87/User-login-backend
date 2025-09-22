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

const groupBookingSchema = Joi.object({
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
    .required()
    .messages({
      'any.required': 'Group ID is required',
      'string.empty': 'Group ID cannot be empty',
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
      'string.empty': 'Timezone cannot be empty'
    })
});

const validateGroupBooking = (req, res, next) => {
  const { error } = groupBookingSchema.validate(req.body, { abortEarly: false });

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
