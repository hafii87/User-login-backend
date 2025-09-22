const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { validateGroup, validateGroupMember, validateGroupCar } = require('../validators/groupValidators');

const {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addMemberToGroup,
  addCarToGroup,
  updateGroupPreferences,
  updateGroupRules,
  getGroupCars
} = require('../controllers/groupControllers');

router.use(verifyToken);

router.post('/', validateGroup, createGroup);
router.get('/my-groups', getUserGroups);
router.get('/:id', getGroupDetails);
router.post('/:id/members', validateGroupMember, addMemberToGroup);
router.post('/:id/cars', validateGroupCar, addCarToGroup);
router.get('/:id/cars', getGroupCars);
router.put('/:id/preferences', updateGroupPreferences);
router.put('/:id/rules', updateGroupRules);

module.exports = router;
