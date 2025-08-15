require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
    if (error) throw Object.assign(new Error(error.details[0].message), { status: 400 });
  } else {
    if (!data.username || !data.email || !data.password) {
      throw Object.assign(new Error('username, email and password are required'), { status: 400 });
    }
  }

  const existing = await userWrapper.findByEmail(data.email);
  if (existing) throw Object.assign(new Error('User already exists with this email'), { status: 400 });

  const hashed = await bcrypt.hash(data.password, 10);
  const created = await userWrapper.createUser({
    username: data.username,
    email: data.email,
    password: hashed
  });

  return {
    message: 'User registered successfully',
    user: { id: created._id, username: created.username, email: created.email }
  };
};

const loginUser = async (data) => {
  if (loginSchema) {
    const { error } = loginSchema.validate(data);
    if (error) throw Object.assign(new Error(error.details[0].message), { status: 400 });
  } else {
    if (!data.email || !data.password) {
      throw Object.assign(new Error('email and password are required'), { status: 400 });
    }
  }

  const user = await userWrapper.findByEmail(data.email);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const payload = { _id: user._id.toString(), username: user.username, email: user.email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  return { message: 'Login successful', token };
};

const updateUserProfile = async (userId, data) => {
  if (updateProfileSchema) {
    const { error } = updateProfileSchema.validate(data);
    if (error) throw Object.assign(new Error(error.details[0].message), { status: 400 });
  }

  const toUpdate = {};
  if (data.username) toUpdate.username = data.username;
  if (data.email) toUpdate.email = data.email;
  if (data.password) toUpdate.password = await bcrypt.hash(data.password, 10);

  const user = await userWrapper.updateById(userId, toUpdate);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return { message: 'User updated successfully', user };
};

const deleteUserAccount = async (userId) => {
  const user = await userWrapper.deleteById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return { message: 'User account deleted successfully' };
};

module.exports = {
  registerUser,
  loginUser,
  updateUserProfile,
  deleteUserAccount
};