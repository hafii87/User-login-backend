const Joi = require('joi');

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


module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
};