const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/User-login', {
      serverSelectionTimeoutMS: 10000, 
    });
    
    console.log(` MongoDB Connected: ${conn.connection.host}`);
    console.log(` Database Name: ${conn.connection.name}`); 
    
  } catch (error) {
    console.error('Database connection error:', error.message);
    
    if (error.message.includes('ServerSelectionError')) {
      console.log('Troubleshooting tips:');
      console.log('1. Check if your IP is whitelisted in MongoDB Atlas');
      console.log('2. Verify your cluster is not paused');
      console.log('3. Check your internet connection');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;