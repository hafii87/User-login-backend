const User = require('../models/userModel');

const createUser = async (userData) => {
  const user = new User(userData);
  return await user.save();
};

const findByEmail = async (email) => {
  return await User.findOne({ email });
};

const findById = async (id) => {
  return await User.findById(id);
};

const updateById = async (id, updateData) => {
  return await User.findByIdAndUpdate(id, updateData, { new: true });
};

const deleteById = async (id) => {
  return await User.findByIdAndDelete(id);
};

const getUserWithCars = async (userId) => {
  return await User.findById(userId).populate({
    path: 'cars',
    match: { isDeleted: false },
    select: 'make model year price isActive isAvailable',
  });
};

module.exports = {
  createUser,
  findByEmail,
  findById,
  updateById,
  deleteById,
  getUserWithCars,
};
