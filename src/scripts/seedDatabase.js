require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const Car = require('../models/carModel');
const Booking = require('../models/bookingModel');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await User.deleteMany({});
    await Car.deleteMany({});
    await Booking.deleteMany({});
    console.log('Cleared existing data...');

    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await User.create([
      {
        username: 'muhammad hafeez',
        email: 'hafeez32@gmail.com',
        password: hashedPassword,
        role: 'user',
        timezone: 'Asia/Karachi'
      },
      {
        username: 'abdullah',
        email: 'abdullah56@gmail.com', 
        password: hashedPassword,
        role: 'user',
        timezone: 'Asia/Karachi'
      },
      {
        username: 'system_admin',
        email: 'admin76@gmail.com', 
        password: hashedPassword,
        role: 'admin',
        timezone: 'Asia/Karachi'
      }
    ]);
    console.log('Created sample users...');

    const cars = await Car.create([
      {
        owner: users[0]._id,
        make: 'Hyundai',
        model: 'Sonata',
        year: 2025,
        price: 45645,
        isBookable: true,
        bookingPreferences: {
          minBookingHours: 2,
          maxBookingDays: 5,
          advanceBookingDays: 30
        }
      },
      {
        owner: users[1]._id, 
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        price: 45003,
        isBookable: true,
        bookingPreferences: {
          minBookingHours: 1,
          maxBookingDays: 7,
          advanceBookingDays: 30
        }
      },
      {
        owner: users[0]._id, 
        make: 'BMW',
        model: 'X5',
        year: 2023,
        price: 8000,
        isBookable: true,
        bookingPreferences: {
          minBookingHours: 4,
          maxBookingDays: 3,
          advanceBookingDays: 30
        }
      }
    ]);
    console.log('Created sample cars...');

    const now = new Date();
    const futureDate1 = new Date(now.getTime() + 24 * 60 * 60 * 1000); 
    const futureDate2 = new Date(now.getTime() + 26 * 60 * 60 * 1000);
    const futureDate3 = new Date(now.getTime() + 48 * 60 * 60 * 1000); 
    const futureDate4 = new Date(now.getTime() + 50 * 60 * 60 * 1000); 

    const bookings = await Booking.create([
      {
        user: users[1]._id, 
        car: cars[0]._id,
        startTime: futureDate1,
        endTime: futureDate2,
        status: 'upcoming',
        bookingTimezone: 'Asia/Karachi'
      },
      {
        user: users[0]._id,
        car: cars[1]._id,
        startTime: futureDate3,
        endTime: futureDate4,
        status: 'upcoming',
        bookingTimezone: 'Asia/Karachi'
      }
    ]);
    console.log('Created sample bookings...');
    
    console.log(' ADMIN LOGIN CREDENTIALS ');
    console.log('Email: admin76@gmail.com');
    console.log('Password: password123');
    console.log('Role: admin');
    console.log('===============================\n');
    
    console.log('Sample Users Created:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - Role: ${user.role}`);
    });
    
    console.log('Sample Cars Created:');
    cars.forEach(car => {
      console.log(`- ${car.make} ${car.model} (${car.year}) - Owner: ${car.owner}`);
    });
    
    console.log('Sample Bookings Created:');
    bookings.forEach(booking => {
      console.log(`- Booking ID: ${booking._id} - Status: ${booking.status}`);
    });

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    mongoose.connection.close();
  }
};

const runSeeder = async () => {
  await connectDB();
  await seedData();
};

runSeeder();
