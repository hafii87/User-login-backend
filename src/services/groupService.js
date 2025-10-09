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
    console.log('Service - Getting group by ID:', groupId);
    const group = await groupWrapper.getGroupById(groupId);
    if (!group) throw new Error('Group not found');

    console.log('Service - Group found:', group.name);
    console.log('Service - Group members:', group.members.length);

    const adder = group.members.find(m => {
      const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
      const isAdmin = m.role === 'admin';
      const isRequester = memberUserId === addedBy.toString();
      
      console.log('Service - Checking member:', {
        memberUserId,
        isAdmin,
        isRequester,
        addedBy: addedBy.toString()
      });
      
      return isRequester && isAdmin;
    });
    
    if (!adder) {
      console.log('Service - No admin found. Available members:', group.members.map(m => ({
        userId: m.user._id ? m.user._id.toString() : m.user.toString(),
        role: m.role,
        status: m.status
      })));
      throw new Error('Only group admins can add members');
    }

    console.log('Service - Admin check passed');

    const existingMember = group.members.find(m => {
      const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
      return memberUserId === userId.toString();
    });
    
    if (existingMember) throw new Error('User is already a member of this group');

    console.log('Service - Checking if user exists');
    const user = await userWrapper.findById(userId);
    if (!user) throw new Error('User not found');

    console.log('Service - Checking eligibility');
    const eligibilityCheck = await checkUserEligibility(user, group.rules);
    if (!eligibilityCheck.eligible) {
      throw new Error(`User does not meet group requirements: ${eligibilityCheck.reasons.join(', ')}`);
    }

    console.log('Service - Adding member to group');
    const updatedGroup = await groupWrapper.addMember(groupId, {
      user: userId,
      role,
      status: 'active',
      joinedAt: new Date()
    });

    console.log('Service - Updating user membership');
    await userWrapper.addGroupMembership(userId, groupId, role, 'active');

    console.log('Service - Member added successfully');
    return updatedGroup;
  } catch (error) {
    console.error('Service Error:', error);
    throw new Error(`Error adding member to group: ${error.message}`);
  }
};

const addCarToGroup = async (groupId, carId, addedBy, allowPrivateBooking = false) => {
  try {
    const group = await groupWrapper.getGroupById(groupId);
    if (!group) throw new Error('Group not found');

    const member = group.members.find(m => {
      const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
      return memberUserId === addedBy.toString() && 
             (m.role === 'admin' || m.status === 'active');
    });
    
    if (!member) throw new Error('Only group members can add cars');

    const car = await carWrapper.getCarById(carId);
    if (!car) throw new Error('Car not found');

    const carOwnerId = car.owner._id ? car.owner._id.toString() : car.owner.toString();
    if (carOwnerId !== addedBy.toString() && member.role !== 'admin') {
      throw new Error('Only car owner or group admin can add this car');
    }

    const carExists = group.cars.some(c => {
      const carIdInGroup = c.car ? c.car.toString() : c.toString();
      return carIdInGroup === carId.toString();
    });

    if (carExists) {
      throw new Error('Car is already in this group');
    }

    const carEntry = {
      car: carId,
      allowPrivateBooking: allowPrivateBooking,
      addedAt: new Date(),
      addedBy: addedBy
    };

    group.cars.push(carEntry);
    await group.save();

    if (!car.groupBookingSettings) {
      car.groupBookingSettings = new Map();
    }
    car.groupBookingSettings.set(groupId.toString(), {
      allowPrivateBooking: allowPrivateBooking,
      addedAt: new Date()
    });
    await car.save();

    return group;
  } catch (error) {
    throw new Error(`Error adding car to group: ${error.message}`);
  }
};

const updateCarPrivateBookingSetting = async (groupId, carId, userId, allowPrivateBooking) => {
  try {
    const group = await groupWrapper.getGroupById(groupId);
    if (!group) throw new Error('Group not found');

    const member = group.members.find(m => {
      const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
      return memberUserId === userId.toString() && m.role === 'admin';
    });

    if (!member) {
      throw new Error('Only group admins can update car settings');
    }

    const carInGroup = group.cars.find(c => {
      const carIdInGroup = c.car._id ? c.car._id.toString() : c.car.toString();
      return carIdInGroup === carId.toString();
    });

    if (!carInGroup) {
      throw new Error('Car not found in this group');
    }

    carInGroup.allowPrivateBooking = allowPrivateBooking;
    await group.save();

    const car = await carWrapper.getCarById(carId);
    if (car && car.groupBookingSettings) {
      const settings = car.groupBookingSettings.get(groupId.toString());
      if (settings) {
        settings.allowPrivateBooking = allowPrivateBooking;
        car.markModified('groupBookingSettings');
        await car.save();
      }
    }

    return group;
  } catch (error) {
    throw new Error(`Error updating car private booking setting: ${error.message}`);
  }
};

const removeCarFromGroup = async (groupId, carId, userId) => {
  try {
    const group = await groupWrapper.getGroupById(groupId);
    if (!group) throw new Error('Group not found');

    const member = group.members.find(m => {
      const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
      return memberUserId === userId.toString() && m.role === 'admin';
    });

    if (!member) {
      throw new Error('Only group admins can remove cars');
    }

    const carExists = group.cars.some(c => {
      const carIdInGroup = c.car._id ? c.car._id.toString() : c.car.toString();
      return carIdInGroup === carId.toString();
    });

    if (!carExists) {
      throw new Error('Car not found in this group');
    }

    group.cars = group.cars.filter(c => {
      const carIdInGroup = c.car._id ? c.car._id.toString() : c.car.toString();
      return carIdInGroup !== carId.toString();
    });
    await group.save();

    const car = await carWrapper.getCarById(carId);
    if (car && car.groupBookingSettings) {
      car.groupBookingSettings.delete(groupId.toString());
      car.markModified('groupBookingSettings');
      await car.save();
    }

    return group;
  } catch (error) {
    throw new Error(`Error removing car from group: ${error.message}`);
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

    const isMember = group.members.some(m => {
      const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
      return memberUserId === userId.toString() && m.status === 'active';
    });

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

    const member = group.members.find(m => {
      const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
      return memberUserId === userId.toString() && m.role === 'admin';
    });
    
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

    const member = group.members.find(m => {
      const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
      return memberUserId === userId.toString() && m.role === 'admin';
    });
    
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

    const isMember = group.members.some(m => {
      const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
      return memberUserId === userId.toString() && m.status === 'active';
    });
    
    if (!isMember) throw new Error('Only group members can view group cars');

    await group.populate('cars.car');

    const carsWithSettings = group.cars.map(carEntry => ({
      car: carEntry.car,
      allowPrivateBooking: carEntry.allowPrivateBooking,
      addedAt: carEntry.addedAt,
      addedBy: carEntry.addedBy
    }));

    return carsWithSettings;
  } catch (error) {
    throw new Error(`Error fetching group cars: ${error.message}`);
  }
};

module.exports = {
  createGroup,
  addMemberToGroup,
  addCarToGroup,
  updateCarPrivateBookingSetting,
  removeCarFromGroup,
  getUserGroups,
  getGroupDetails,
  updateGroupPreferences,
  updateGroupRules,
  getGroupCars,
  checkUserEligibility
};