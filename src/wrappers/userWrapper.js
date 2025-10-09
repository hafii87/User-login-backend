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

const findByEmailVerificationToken = async (token) => {
  return await User.findOne({ emailVerificationToken: token });
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

const addGroupMembership = async (userId, groupId, role, status) => {
  try {
    return await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          groupMemberships: {
            group: groupId,
            role: role,
            status: status
          }
        }
      },
      { new: true }
    );
  } catch (error) {
    throw new Error(`Error adding group membership: ${error.message}`);
  }
};

const removeGroupMembership = async (userId, groupId) => {
  try {
    return await User.findByIdAndUpdate(
      userId,
      {
        $pull: {
          groupMemberships: { group: groupId }
        }
      },
      { new: true }
    );
  } catch (error) {
    throw new Error(`Error removing group membership: ${error.message}`);
  }
};

const getUserGroups = async (userId) => {
  try {
    return await User.findById(userId)
      .populate({
        path: 'groupMemberships.group',
        match: { isActive: true },
        select: 'name description privacy'
      })
      .select('groupMemberships');
  } catch (error) {
    throw new Error(`Error fetching user groups: ${error.message}`);
  }
};

const findByPhone = async (phone) => {
  try {
    return await User.findOne({ phone: phone });
  } catch (error) {
    throw new Error(`Error finding user by phone: ${error.message}`);
  }
};

module.exports = {
  createUser,
  findByEmail,
  findById,
  findByEmailVerificationToken,
  updateById,
  deleteById,
  getUserWithCars,
  addGroupMembership,
  removeGroupMembership,
  getUserGroups,
  findByPhone
};