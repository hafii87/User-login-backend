let users = [];

const getUserInfo = (req, res) => {
  res.json(users);
};

const registerUser = (req, res) => {
  const { name, email } = req.body;
  users.push({ name, email });
  res.status(201).json({ message: 'User registered', users });
};

const loginUser = (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  if (user) {
    res.json({ message: 'Login successful' });
  } else {
    res.status(401).json({ message: 'User not found' });
  }
};

const updateUserProfile = (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (users[id]) {
    users[id].name = name;
    res.json({ message: 'User updated', user: users[id] });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

const deleteUserAccount = (req, res) => {
  const { id } = req.params;
  if (users[id]) {
    users.splice(id, 1);
    res.json({ message: 'User deleted' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

module.exports = {
  getUserInfo,
  registerUser,
  loginUser,
  updateUserProfile,
  deleteUserAccount,
};
