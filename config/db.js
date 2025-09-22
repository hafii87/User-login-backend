const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const MONGO_URI =
      process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/User-login';

    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, 
    });

    console.log(` MongoDB Connected: ${conn.connection.host}`);
    console.log(` Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(' Database connection error:', error.message);

    if (error.message.includes('ServerSelection')) {
      console.log('\n Troubleshooting tips:');
      console.log('1. Check if your IP is whitelisted in MongoDB Atlas');
      console.log('2. Verify your MongoDB cluster is not paused');
      console.log('3. Ensure your MONGO_URI is correct in Railway Variables');
      console.log('4. Restart the deployment after fixing DB access\n');
    }

    process.exit(1); 
  }
};

module.exports = connectDB;
