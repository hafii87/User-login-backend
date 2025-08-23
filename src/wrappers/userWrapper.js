const User = require('../models/userModel');
const { AppError } = require('../middleware/errorhandler');

const createUser = async (userData) => {
  try {
    const user = new User(userData);
    return await user.save();
  } catch (error) {
    throw new Error(`Error creating user: ${error.message}`);
  }
};

const findByEmail = async (email) => {
  try {
    const user = await User.findOne({ email });
    return user; 
  } catch (error) {
    throw new Error(`Database error while finding user by email: ${error.message}`);
  }
};

const findById = async (id) => {
  try {
    return await User.findById(id); 
  } catch (err) {
    throw new AppError(`Error finding user by ID: ${err.message}`, 500);
  }
};

const updateById = async (id, updateData) => {
  try {
    return await User.findByIdAndUpdate(id, updateData, { new: true });
  } catch (err) {
    throw new AppError(`Failed to update user: ${err.message}`, 400);
  }
};

const deleteById = async (id) => {
  try {
    return await User.findByIdAndDelete(id);
  } catch (err) {
    throw new AppError(`Failed to delete user: ${err.message}`, 400);
  }
};

const getUserWithCars = async (userId) => {
  try {
    return await User.findById(userId).populate('cars'); 
  } catch (err) {
    throw new AppError(`Error fetching user with cars: ${err.message}`, 500);
  }
};

module.exports = {
  createUser,
  findByEmail,    
  findById,
  updateById,
  deleteById,
  getUserWithCars,
};
