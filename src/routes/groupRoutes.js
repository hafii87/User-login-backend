const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const { validateGroup, validateGroupMember, validateGroupCar, validateGroupBooking } = require('../validators/groupValidators');

const {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addMemberToGroup,
  addCarToGroup,
  updateCarPrivateBooking,
  removeCarFromGroup,
  updateGroupPreferences,
  updateGroupRules,
  getGroupCars,
} = require('../controllers/groupController');

router.use(verifyToken);

router.post('/', validateGroup, createGroup);
router.get('/my-groups', getUserGroups);
router.post('/:id/cars', validateGroupCar, addCarToGroup);
router.post('/:id/members', validateGroupMember, addMemberToGroup);
router.get('/:id/cars', getGroupCars);
router.get('/:id', getGroupDetails);
router.patch('/:groupId/cars/:carId/private-booking', updateCarPrivateBooking);
router.delete('/:groupId/cars/:carId', removeCarFromGroup);
router.put('/:id/preferences', updateGroupPreferences);
router.put('/:id/rules', updateGroupRules);

module.exports = router;