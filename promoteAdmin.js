require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/userModel');

const promoteToAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');

    const emailToPromote = 'muhammadhafeezurrehman77+api4@gmail.com';

    const result = await User.findOneAndUpdate(
      { email: emailToPromote }, 
      { role: 'admin' },
      { new: true, runValidators: true }
    );

    if (result) {
      console.log('SUCCESS! User promoted to admin:');
      console.log('Username:', result.username);
      console.log('Email:', result.email);
      console.log('Role:', result.role);
    } else {
      console.log('User not found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
};

promoteToAdmin();