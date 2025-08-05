const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config(); 

let users = [
  { name: 'hafeez', email: 'hafeez21@gmail.com', password: '123456' },
  { name: 'hafii', email: 'hafii32@gmail.com', password: 'password123' },
];

const getUserInfo = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  res.status(200).json({
    message: 'User information retrieved successfully',
    user: req.user,
  });
};

const registerUser = (req, res) => {
  const { name, email, password } = req.body;
  const existingUser = users.find(u => u.name === name && u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists with this email' });
  }
  const newUser = { name, email, password };
  users.push(newUser);
  console.log('NEW USER:', newUser);
  res.status(201).json({ message: 'User registered successfully', user: newUser });
};

const loginUser = (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, { httpOnly: true });

  res.json({ message: 'Login successful', token });
};

const logoutUser = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
};

const updateUserProfile = (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;
  const index = parseInt(id);
  if (isNaN(index) || !users[index]) {
    return res.status(404).json({ message: 'User not found' });
  }
  users[index] = { ...users[index], name, email, password };
  res.json({ message: 'User updated', user: users[index] });
};

const deleteUserAccount = (req, res) => {
  const { id } = req.params;
  const index = parseInt(id);
  if (isNaN(index) || !users[index]) {
    return res.status(404).json({ message: 'User not found' });
  }
  users.splice(index, 1);
  res.json({ message: 'User deleted successfully' });
};

module.exports = {
  getUserInfo,
  registerUser,
  loginUser,
  logoutUser,
  updateUserProfile,
  deleteUserAccount,
};
