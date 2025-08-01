const express = require('express');
const router = express.Router();
const {
  getUserInfo,
  registerUser,
  loginUser,
  updateUserProfile,
  deleteUserAccount,
} = require('../controllers/usercontrollers');


router.get('/', getUserInfo);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/:id', updateUserProfile);
router.delete('/:id', deleteUserAccount);

module.exports = router;
