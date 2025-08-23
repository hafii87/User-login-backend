const Joi = require('joi');
const { AppError } = require('../middleware/errorhandler'); 

const registerSchema = Joi.object({
  username: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const updateProfileSchema = Joi.object({
  username: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
});

const validate = (schema) => (req, res, next) => {
  if (req.body.username) req.body.username = req.body.username.trim();
  if (req.body.email) req.body.email = req.body.email.trim().toLowerCase();
  if (req.body.password) req.body.password = req.body.password.trim();

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
