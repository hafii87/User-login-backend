const Group = require('../models/groupModel');

const createGroup = async (groupData) => {
  try {
    const group = new Group(groupData);
    return await group.save();
  } catch (error) {
    throw new Error(`Error creating group: ${error.message}`);
  }
};

const getGroupById = async (groupId) => {
  try {
    return await Group.findById(groupId)
      .populate('creator', 'username email')
      .populate('members.user', 'username email phone isEmailVerified isPhoneVerified')
      .populate('cars', 'make model year price owner isAvailable');
  } catch (error) {
    throw new Error(`Error fetching group: ${error.message}`);
  }
};

const getUserGroups = async (userId) => {
  try {
    return await Group.find({
      'members.user': userId,
      'members.status': 'active',
      isActive: true
    })
    .populate('creator', 'username email')
    .populate('cars', 'make model year price owner isAvailable')
    .select('name description creator members cars preferences rules privacy createdAt');
  } catch (error) {
    throw new Error(`Error fetching user groups: ${error.message}`);
  }
};

const addMember = async (groupId, memberData) => {
  try {
    return await Group.findByIdAndUpdate(
      groupId,
      { $push: { members: memberData } },
      { new: true, runValidators: true }
    )
    .populate('creator', 'username email')
    .populate('members.user', 'username email phone')
    .populate('cars', 'make model year price owner');
  } catch (error) {
    throw new Error(`Error adding member: ${error.message}`);
  }
};

const addCar = async (groupId, carId) => {
  try {
    return await Group.findByIdAndUpdate(
      groupId,
      { $push: { cars: carId } },
      { new: true, runValidators: true }
    )
    .populate('creator', 'username email')
    .populate('members.user', 'username email')
    .populate('cars', 'make model year price owner isAvailable');
  } catch (error) {
    throw new Error(`Error adding car to group: ${error.message}`);
  }
};

const removeMember = async (groupId, userId) => {
  try {
    return await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: { user: userId } } },
      { new: true }
    );
  } catch (error) {
    throw new Error(`Error removing member: ${error.message}`);
  }
};

const removeCar = async (groupId, carId) => {
  try {
    return await Group.findByIdAndUpdate(
      groupId,
      { $pull: { cars: carId } },
      { new: true }
    );
  } catch (error) {
    throw new Error(`Error removing car from group: ${error.message}`);
  }
};

const updateGroup = async (groupId, updateData) => {
  try {
    return await Group.findByIdAndUpdate(
      groupId,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('creator', 'username email')
    .populate('members.user', 'username email')
    .populate('cars', 'make model year price owner');
  } catch (error) {
    throw new Error(`Error updating group: ${error.message}`);
  }
};

const getGroupCars = async (groupId) => {
  try {
    const group = await Group.findById(groupId)
      .populate({
        path: 'cars',
        populate: {
          path: 'owner',
          select: 'username email'
        }
      });
    
    return group ? group.cars : [];
  } catch (error) {
    throw new Error(`Error fetching group cars: ${error.message}`);
  }
};

const searchGroups = async (searchQuery, userId) => {
  try {
    const query = {
      isActive: true,
      $or: [
        { privacy: 'public' },
        { 'members.user': userId }
      ]
    };

    if (searchQuery) {
      query.$text = { $search: searchQuery };
    }

    return await Group.find(query)
      .populate('creator', 'username email')
      .select('name description creator privacy activeMembersCount carsCount createdAt')
      .limit(20);
  } catch (error) {
    throw new Error(`Error searching groups: ${error.message}`);
  }
};

module.exports = {
  createGroup,
  getGroupById,
  getUserGroups,
  addMember,
  addCar,
  removeMember,
  removeCar,
  updateGroup,
  getGroupCars,
  searchGroups
};
