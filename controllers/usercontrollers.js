const { registerSchema, loginSchema, updateProfileSchema } = require('../validators/userValidators');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/user');

const getUserInfo = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  res.status(200).json({
    message: 'User information retrieved successfully',
    user: req.user,
  });
};

const registerUser = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: 'Invalid user data', error: error.details });
  }
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });
    await newUser.save();
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Error registering user', error: err.message });
  }
};


const loginUser = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: 'Invalid login data', error: error.details });
  }
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: existingUser._id, name: existingUser.username, email: existingUser.email },process.env.JWT_SECRET,  { expiresIn: '1h' }
    );
    res.cookie('token', token, { httpOnly: true });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
};

const logoutUser = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
};

const updateUserProfile = async (req, res) => {
  const { error } = updateProfileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: 'Invalid profile data', error: error.details });
  }
  const { id } = req.params;
  const { username, email, password } = req.body;
  try {
    const updatedFields = { username, email };
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedFields.password = hashedPassword;
    }
    const user = await User.findByIdAndUpdate(id, updatedFields, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user', error: err.message });
  }
};

const deleteUserAccount = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
};


module.exports = {
  getUserInfo,
  registerUser,
  loginUser,
  logoutUser,
  updateUserProfile,
  deleteUserAccount,
};
