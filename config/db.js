const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI 
      || "mongodb+srv://muhammadhafeezurrehman77_db_user:Hafeez123!%40%23@car-booking-cluster.hhdrth5.mongodb.net/?retryWrites=true&w=majority&appName=Car-booking-cluster";
  
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      dbName: 'test'  
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
