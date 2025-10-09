const groupService = require('../services/groupService');
const { AppError } = require('../middleware/errorhandler');

const createGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const groupData = req.body;

    if (!groupData.name) {
      return next(new AppError('Group name is required', 400));
    }

    const group = await groupService.createGroup(groupData, userId);
    
    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to create group', 400));
  }
};

const getUserGroups = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const groups = await groupService.getUserGroups(userId);
    
    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch user groups', 400));
  }
};

const getGroupDetails = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;
    
    const group = await groupService.getGroupDetails(groupId, userId);
    
    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch group details', 400));
  }
};

const addMemberToGroup = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const { userId, role = 'member' } = req.body;
    const addedBy = req.user.id;

    if (!userId) {
      return next(new AppError('User ID is required', 400));
    }

    const updatedGroup = await groupService.addMemberToGroup(
      groupId, 
      userId, 
      addedBy, 
      role
    );
    
    res.status(200).json({
      success: true,
      message: 'Member added to group successfully',
      data: updatedGroup
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to add member to group', 400));
  }
};

const addCarToGroup = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const { carId, allowPrivateBooking = false } = req.body;
    const addedBy = req.user.id;

    if (!carId) {
      return next(new AppError('Car ID is required', 400));
    }

    const updatedGroup = await groupService.addCarToGroup(
      groupId, 
      carId, 
      addedBy, 
      allowPrivateBooking
    );
    
    res.status(200).json({
      success: true,
      message: 'Car added to group successfully',
      data: updatedGroup
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to add car to group', 400));
  }
};

const updateCarPrivateBooking = async (req, res, next) => {
  try {
    const { groupId, carId } = req.params;
    let { allowPrivateBooking } = req.body;
    const userId = req.user.id;

    if (allowPrivateBooking === 'true') allowPrivateBooking = true;
    if (allowPrivateBooking === 'false') allowPrivateBooking = false;

    const updatedGroup = await groupService.updateCarPrivateBookingSetting(
      groupId,
      carId,
      userId,
      Boolean(allowPrivateBooking)
    );

    res.status(200).json({
      success: true,
      message: `Private booking ${allowPrivateBooking ? 'enabled' : 'disabled'} for this car`,
      data: updatedGroup
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to update car private booking setting', 400));
  }
};

const removeCarFromGroup = async (req, res, next) => {
  try {
    const { groupId, carId } = req.params;
    const userId = req.user.id;

    const updatedGroup = await groupService.removeCarFromGroup(groupId, carId, userId);

    res.status(200).json({
      success: true,
      message: 'Car removed from group successfully',
      data: updatedGroup
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to remove car from group', 400));
  }
};

const updateGroupPreferences = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const preferences = req.body;
    const userId = req.user.id;

    const updatedGroup = await groupService.updateGroupPreferences(
      groupId, 
      preferences, 
      userId
    );
    
    res.status(200).json({
      success: true,
      message: 'Group preferences updated successfully',
      data: updatedGroup
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to update group preferences', 400));
  }
};

const updateGroupRules = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const rules = req.body;
    const userId = req.user.id;

    const updatedGroup = await groupService.updateGroupRules(groupId, rules, userId);
    
    res.status(200).json({
      success: true,
      message: 'Group rules updated successfully',
      data: updatedGroup
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to update group rules', 400));
  }
};

const getGroupCars = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;
    
    const cars = await groupService.getGroupCars(groupId, userId);
    
    res.status(200).json({
      success: true,
      count: cars.length,
      data: cars
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch group cars', 400));
  }
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addMemberToGroup,
  addCarToGroup,
  updateCarPrivateBooking,
  removeCarFromGroup,
  updateGroupPreferences,
  updateGroupRules,
  getGroupCars
};