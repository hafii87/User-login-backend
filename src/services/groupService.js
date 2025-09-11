const groupWrapper = require('../wrappers/groupWrapper');
const userWrapper = require('../wrappers/userWrapper');
const carWrapper = require('../wrappers/carWrapper');
const { AppError } = require('../middleware/errorhandler');

const createGroup = async (groupData, creatorId) => {
  try {
    const groupWithCreator = {
      ...groupData,
      creator: creatorId,
      members: [{
        user: creatorId,
        role: 'admin',
        status: 'active',
        joinedAt: new Date()
      }]
    };

    const group = await groupWrapper.createGroup(groupWithCreator);
    
    await userWrapper.addGroupMembership(creatorId, group._id, 'admin', 'active');
    
    return group;
  } catch (error) {
    throw new Error(`Error creating group: ${error.message}`);
  }
};

const addMemberToGroup = async (groupId, userId, addedBy, role = 'member') => {
  try {
    const group = await groupWrapper.getGroupById(groupId);
    if (!group) throw new Error('Group not found');

    const adder = group.members.find(m => 
      m.user.toString() === addedBy.toString() && m.role === 'admin'
    );
    if (!adder) throw new Error('Only group admins can add members');

    const existingMember = group.members.find(m => 
      m.user.toString() === userId.toString()
    );
    if (existingMember) throw new Error('User is already a member of this group');

    const user = await userWrapper.findById(userId);
    if (!user) throw new Error('User not found');

    const eligibilityCheck = await checkUserEligibility(user, group.rules);
    if (!eligibilityCheck.eligible) {
      throw new Error(`User does not meet group requirements: ${eligibilityCheck.reasons.join(', ')}`);
    }

    const updatedGroup = await groupWrapper.addMember(groupId, {
      user: userId,
      role,
      status: 'active',
      joinedAt: new Date()
    });

    await userWrapper.addGroupMembership(userId, groupId, role, 'active');

    return updatedGroup;
  } catch (error) {
    throw new Error(`Error adding member to group: ${error.message}`);
  }
};

const addCarToGroup = async (groupId, carId, addedBy) => {
  try {
    const group = await groupWrapper.getGroupById(groupId);
    if (!group) throw new Error('Group not found');

    const member = group.members.find(m => 
      m.user.toString() === addedBy.toString() && 
      (m.role === 'admin' || m.status === 'active')
    );
    if (!member) throw new Error('Only group members can add cars');

    const car = await carWrapper.getCarById(carId);
    if (!car) throw new Error('Car not found');

    if (car.owner.toString() !== addedBy.toString() && member.role !== 'admin') {
      throw new Error('Only car owner or group admin can add this car');
    }

    if (group.cars.includes(carId)) {
      throw new Error('Car is already in this group');
    }

    return await groupWrapper.addCar(groupId, carId);
  } catch (error) {
    throw new Error(`Error adding car to group: ${error.message}`);
  }
};

const checkUserEligibility = async (user, rules) => {
  const reasons = [];
  let eligible = true;

  if (rules.emailVerified && !user.isEmailVerified) {
    eligible = false;
    reasons.push('Email verification required');
  }

  if (rules.phoneVerified && !user.isPhoneVerified) {
    eligible = false;
    reasons.push('Phone verification required');
  }

  if (rules.licenseRequired && !user.isLicenseVerified) {
    eligible = false;
    reasons.push('Valid license required');
  }

  if (rules.backgroundCheckRequired && !user.isBackgroundChecked) {
    eligible = false;
    reasons.push('Background check required');
  }

  if (rules.minimumAge && user.dateOfBirth) {
    const age = Math.floor((Date.now() - user.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < rules.minimumAge) {
      eligible = false;
      reasons.push(`Minimum age ${rules.minimumAge} required`);
    }
  }

  return { eligible, reasons };
};

const getUserGroups = async (userId) => {
  try {
    return await groupWrapper.getUserGroups(userId);
  } catch (error) {
    throw new Error(`Error fetching user groups: ${error.message}`);
  }
};

const getGroupDetails = async (groupId, userId) => {
  try {
    const group = await groupWrapper.getGroupById(groupId);
    if (!group) throw new Error('Group not found');

    const isMember = group.members.some(m => 
      m.user.toString() === userId.toString() && m.status === 'active'
    );

    if (!isMember && group.privacy === 'private') {
      throw new Error('Access denied to private group');
    }

    return group;
  } catch (error) {
    throw new Error(`Error fetching group details: ${error.message}`);
  }
};

const updateGroupPreferences = async (groupId, preferences, userId) => {
  try {
    const group = await groupWrapper.getGroupById(groupId);
    if (!group) throw new Error('Group not found');

    const member = group.members.find(m => 
      m.user.toString() === userId.toString() && m.role === 'admin'
    );
    if (!member) throw new Error('Only group admins can update preferences');

    return await groupWrapper.updateGroup(groupId, { preferences });
  } catch (error) {
    throw new Error(`Error updating group preferences: ${error.message}`);
  }
};

const updateGroupRules = async (groupId, rules, userId) => {
  try {
    const group = await groupWrapper.getGroupById(groupId);
    if (!group) throw new Error('Group not found');

    const member = group.members.find(m => 
      m.user.toString() === userId.toString() && m.role === 'admin'
    );
    if (!member) throw new Error('Only group admins can update rules');

    return await groupWrapper.updateGroup(groupId, { rules });
  } catch (error) {
    throw new Error(`Error updating group rules: ${error.message}`);
  }
};

const getGroupCars = async (groupId, userId) => {
  try {
    const group = await groupWrapper.getGroupById(groupId);
    if (!group) throw new Error('Group not found');

    const isMember = group.members.some(m => 
      m.user.toString() === userId.toString() && m.status === 'active'
    );
    if (!isMember) throw new Error('Only group members can view group cars');

    return await groupWrapper.getGroupCars(groupId);
  } catch (error) {
    throw new Error(`Error fetching group cars: ${error.message}`);
  }
};

module.exports = {
  createGroup,
  addMemberToGroup,
  addCarToGroup,
  getUserGroups,
  getGroupDetails,
  updateGroupPreferences,
  updateGroupRules,
  getGroupCars,
  checkUserEligibility
};