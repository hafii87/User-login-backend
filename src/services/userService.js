require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorhandler');
const userWrapper = require('../wrappers/userWrapper');

let registerSchema, loginSchema, updateProfileSchema;
try {
  ({ registerSchema, loginSchema, updateProfileSchema } = require('../validators/userValidators'));
} catch (e) {
  registerSchema = loginSchema = updateProfileSchema = null;
}

const JWT_SECRET = process.env.JWT_SECRET || 'some_secret_key';

const registerUser = async (data) => {
  if (registerSchema) {
    const { error } = registerSchema.validate(data);
    if (error) throw new AppError(error.details[0].message, 400);
  } else {
    if (!data.username || !data.email || !data.password) {
      throw new AppError('username, email and password are required', 400);
    }
  }

  const existing = await userWrapper.findByEmail(data.email);
  if (existing) throw new AppError('User already exists with this email', 400);

  const hashed = await bcrypt.hash(data.password, 10);
  const created = await userWrapper.createUser({
    username: data.username,
    email: data.email,
    password: hashed,
  });

  return created;
};

const loginUser = async (data) => {
  if (loginSchema) {
    const { error } = loginSchema.validate(data);
    if (error) throw new AppError(error.details[0].message, 400);
  } else {
    if (!data.email || !data.password) {
      throw new AppError('email and password are required', 400);
    }
  }

  const user = await userWrapper.findByEmail(data.email);
  if (!user) throw new AppError('User not found', 404);

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) throw new AppError('Invalid credentials', 401);

  const payload = { 
    id: user.id.toString(), 
    username: user.username, 
    email: user.email 
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' }); 

  return { user, token };
};

const updateUserProfile = async (userId, data) => {
  if (updateProfileSchema) {
    const { error } = updateProfileSchema.validate(data);
    if (error) throw new AppError(error.details[0].message, 400);
  }

  const toUpdate = {};
  if (data.username) toUpdate.username = data.username;
  if (data.email) toUpdate.email = data.email;
  if (data.password) toUpdate.password = await bcrypt.hash(data.password, 10);

  const user = await userWrapper.updateById(userId, toUpdate);
  if (!user) throw new AppError('User not found', 404);

  return user;
};

const deleteUserAccount = async (userId) => {
  const user = await userWrapper.deleteById(userId);
  if (!user) throw new AppError('User not found', 404);
  return true;
};

const getUserWithCars = async (userId) => {
  return await userWrapper.getUserWithCars(userId);
};

module.exports = {
  registerUser,
  loginUser,
  updateUserProfile,
  deleteUserAccount,
  getUserWithCars,
};