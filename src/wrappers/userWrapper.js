const User = require('../models/userModel');

const createUser = (userData) => {
  return User.create(userData);
};

const findByEmail = (email) => {
  return User.findOne({ email });
};

const findById = (id) => {
  return User.findById(id);
};

const updateById = (id, updateData) => {
  return User.findByIdAndUpdate(id, updateData, { new: true });
};

const deleteById = (id) => {
  return User.findByIdAndDelete(id);
};

module.exports = {
  createUser,
  findByEmail,
  findById,
  updateById,
  deleteById
};