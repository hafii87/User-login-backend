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
  const { emailVerificationToken, ...userData } = data;
  
  if (registerSchema) {
    const { error } = registerSchema.validate(userData);
    if (error) throw new AppError(error.details[0].message, 400);
  } else {
    if (!userData.username || !userData.email || !userData.password || !userData.phone || !userData.drivingLicenseNumber || !userData.dateOfBirth) {
      throw new AppError('All fields are required: username, email, password, phone, drivingLicenseNumber, dateOfBirth', 400);
    }
  }

  const existing = await userWrapper.findByEmail(userData.email);
  if (existing) throw new AppError('User already exists with this email', 400);

  const hashed = await bcrypt.hash(userData.password, 10);
  
  const created = await userWrapper.createUser({
    username: userData.username,
    email: userData.email,
    password: hashed,
    phone: userData.phone,
    drivingLicenseNumber: userData.drivingLicenseNumber,
    dateOfBirth: userData.dateOfBirth,
    emailVerificationToken: emailVerificationToken,
    isEmailVerified: false,
    accountStatus: 'pending'
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

const verifyEmailToken = async (token) => {
  try {
    const user = await userWrapper.findByEmailVerificationToken(token);
    if (!user) throw new AppError('Invalid or expired verification token', 400);

    const updatedUser = await userWrapper.updateById(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerifiedAt: new Date()
    });

    return updatedUser;
  } catch (error) {
    throw new AppError(`Error verifying email: ${error.message}`, 500);
  }
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
  if (data.phone) toUpdate.phone = data.phone;
  if (data.drivingLicenseNumber) toUpdate.drivingLicenseNumber = data.drivingLicenseNumber;

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

const findUserByPhone = async (phone) => {
  try {
    return await userWrapper.findByPhone(phone);
  } catch (error) {
    throw new AppError(`Error finding user by phone: ${error.message}`, 500);
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyEmailToken,
  updateUserProfile,
  deleteUserAccount,
  getUserWithCars,
  findUserByPhone
};
