const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userService = require('../services/userService');
const emailService = require('../services/emailService');
const { AppError } = require('../middleware/errorhandler');

const registerUser = async (req, res, next) => {
  try {
    const { username, email, password, phone, drivingLicenseNumber, dateOfBirth } = req.body;

    if (!username || !email || !password || !phone || !drivingLicenseNumber || !dateOfBirth) {
      return next(new AppError('All fields are required: username, email, password, phone, drivingLicenseNumber, dateOfBirth', 400));
    }

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const user = await userService.registerUser({
      ...req.body,
      emailVerificationToken
    });

    await emailService.sendEmailVerification(user.email, {
      username: user.username,
      verificationToken: emailVerificationToken
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please verify your email to complete registration.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        accountStatus: user.accountStatus,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await userService.verifyEmailToken(token);
    if (!user) {
      return next(new AppError('Invalid or expired verification token', 400));
    }

    await emailService.sendWelcomeEmail(user.email, {
      username: user.username,
      email: user.email
    });

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully!',
      user: {
        id: user.id,
        username: user.username,
        isEmailVerified: user.isEmailVerified,
        accountStatus: user.accountStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

const getUserWithCars = async (req, res, next) => {
  try {
    const user = await userService.getUserWithCars(req.user.id); 
    if (!user) return next(new AppError('User not found', 404));

    res.status(200).json({
      status: 'success',
      data: user 
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Email and password are required', 400));
    }

    const { user, token } = await userService.loginUser({ email, password });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        accountStatus: user.accountStatus,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      message: 'User logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateUserProfile(req.user.id, req.body);
    if (!updatedUser) return next(new AppError('User not found', 404));

    res.status(200).json({
      status: 'success',
      message: 'User profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

const deleteUserAccount = async (req, res, next) => {
  try {
    await userService.deleteUserAccount(req.body); 
    res.status(200).json({
      status: 'success',
      message: 'User account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserWithCars,
  registerUser,
  verifyEmail,
  loginUser,
  logoutUser,
  updateUserProfile,
  deleteUserAccount,
};
