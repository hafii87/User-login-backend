require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/UserModel');

const promoteToAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' Connected to MongoDB...');

    const result = await User.findOneAndUpdate(
      { email: 'admin@test.com' }, 
      { role: 'admin' },
      { new: true, runValidators: true }
    );

    if (result) {
      console.log(' SUCCESS! User promoted to admin:');
      console.log('ID:', result._id);
      console.log('Username:', result.username);
      console.log('Email:', result.email);
      console.log('Role:', result.role);
      console.log('================================');
      console.log(' ADMIN LOGIN CREDENTIALS:');
      console.log('Email: admin@test.com');
      console.log('Password: password123');
      console.log('Role: admin');
    } else {
      console.log(' User not found. Make sure you created a user with email: admin@test.com');
      
      const allUsers = await User.find({}).select('email username role');
      console.log('📋 Existing users:');
      allUsers.forEach(user => {
        console.log(`- ${user.email} (${user.username}) - Role: ${user.role || 'user'}`);
      });
    }

  } catch (error) {
    console.error(' Error:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check your MongoDB Atlas IP whitelist');
      console.log('2. Verify your internet connection');
      console.log('3. Check if your cluster is paused');
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

promoteToAdmin();

