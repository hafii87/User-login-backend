const userService = require('../services/userService');


const getUserWithCars = async (req, res) => {
  try {
    const userData = await userService.getUserWithCars(req.user._id);
    res.status(200).json(userData);
  } catch (error) {
    console.error("Error fetching user with cars:", error);
    res.status(500).json({ message: 'Failed to fetch user with cars', error: error.message });
  }
};

const registerUser = async (req, res) => {
  try {
    const user = await userService.registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(400).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const token = await userService.loginUser(req.body);
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(401).json({ message: error.message });
  }
};

const logoutUser = async (req, res) => {
  try {
    await userService.logoutUser(req.user._id);
    res.status(200).json({ message: 'User logged out successfully' });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ message: error.message });
  }
};


const updateUserProfile = async (req, res) => {
  try {
    const updatedUser = await userService.updateUserProfile(req.user._id, req.body);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(400).json({ message: error.message });
  }
};


const deleteUserAccount = async (req, res) => {
  try {
    await userService.deleteUserAccount(req.user._id);
    res.status(200).json({ message: 'User account deleted successfully' });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserWithCars,
  registerUser,
  loginUser,
  logoutUser,
  updateUserProfile,
  deleteUserAccount
};
