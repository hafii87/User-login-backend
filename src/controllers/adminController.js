const User = require('../models/userModel');
const Car = require('../models/carModel');
const Booking = require('../models/bookingModel');
const { AppError } = require('../middleware/errorhandler');
const { convertFromUTC, formatDateForDisplay, isValidTimezone } = require('../utils/timezoneUtils');
const agenda = require('../jobs/agenda');


const getAllBookings = async (req, res, next) => {
  try {
    const userTimezone = req.query.timezone || 'Asia/Karachi';
    
    if (!isValidTimezone(userTimezone)) {
      return next(new AppError('Invalid timezone', 400));
    }

    const bookings = await Booking.find({})
      .populate('user', 'username email')
      .populate('car', 'make model year price owner')
      .sort({ createdAt: -1 });

    const bookingsWithLocalTime = bookings.map(booking => ({
      ...booking.toObject(),
      startTimeLocal: convertFromUTC(booking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(booking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(booking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(booking.endTime, userTimezone)
    }));

    res.status(200).json({
      success: true,
      message: 'All bookings retrieved successfully',
      count: bookingsWithLocalTime.length,
      data: bookingsWithLocalTime,
      timezone: userTimezone
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch all bookings', 500));
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').populate({
      path: 'cars',
      match: { isDeleted: false },
      select: 'make model year price isActive isAvailable'
    });

    res.status(200).json({
      success: true,
      message: 'All users retrieved successfully',
      count: users.length,
      data: users
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch all users', 500));
  }
};

const getAllCars = async (req, res, next) => {
  try {
    const cars = await Car.find({}).populate('owner', 'username email');

    res.status(200).json({
      success: true,
      message: 'All cars retrieved successfully',
      count: cars.length,
      data: cars
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch all cars', 500));
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return next(new AppError('User ID is required', 400));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (userId === req.user.id) {
      return next(new AppError('Cannot delete your own account', 400));
    }

    const upcomingBookings = await Booking.find({ 
      user: userId, 
      status: { $in: ['upcoming', 'ongoing'] }
    });

    for (let booking of upcomingBookings) {
      booking.status = 'cancelled';
      await booking.save();
      
      try {
        await agenda.cancel({ 
          $or: [
            { "data.bookingId": booking._id.toString() },
            { "data.bookingId": booking._id }
          ]
        });
      } catch (jobError) {
        console.error('Error cancelling jobs for booking:', booking._id, jobError.message);
      }

      if (booking.car) {
        await Car.findByIdAndUpdate(booking.car, { isAvailable: true });
      }
    }

    await Car.updateMany(
      { owner: userId },
      { 
        isDeleted: true, 
        deletedAt: new Date(), 
        deletedBy: req.user.id 
      }
    );

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: `User deleted successfully. ${upcomingBookings.length} bookings were cancelled.`,
      deletedUser: {
        id: userId,
        username: user.username,
        email: user.email
      },
      cancelledBookings: upcomingBookings.length
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to delete user', 500));
  }
};

const deleteCar = async (req, res, next) => {
  try {
    const carId = req.params.id;

    if (!carId) {
      return next(new AppError('Car ID is required', 400));
    }

    const car = await Car.findOne({ _id: carId, isDeleted: false });
    if (!car) {
      return next(new AppError('Car not found or already deleted', 404));
    }

    const upcomingBookings = await Booking.find({ 
      car: carId, 
      status: { $in: ['upcoming', 'ongoing'] }
    });

    for (let booking of upcomingBookings) {
      booking.status = 'cancelled';
      await booking.save();
      
      try {
        await agenda.cancel({ 
          $or: [
            { "data.bookingId": booking._id.toString() },
            { "data.bookingId": booking._id }
          ]
        });
      } catch (jobError) {
        console.error('Error cancelling jobs for booking:', booking._id, jobError.message);
      }
    }

    const deletedCar = await Car.findByIdAndUpdate(
      carId,
      { 
        isDeleted: true, 
        deletedAt: new Date(), 
        deletedBy: req.user.id 
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Car deleted successfully. ${upcomingBookings.length} bookings were cancelled.`,
      deletedCar: {
        id: carId,
        make: car.make,
        model: car.model,
        year: car.year,
        owner: car.owner
      },
      cancelledBookings: upcomingBookings.length
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to delete car', 500));
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCars = await Car.countDocuments({ isDeleted: false });
    const totalBookings = await Booking.countDocuments();
    
    const bookingStats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const carStats = await Car.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalCars: { $sum: 1 },
          availableCars: { 
            $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] } 
          },
          bookableCars: { 
            $sum: { $cond: [{ $eq: ['$isBookable', true] }, 1, 0] } 
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        users: {
          total: totalUsers
        },
        cars: {
          total: totalCars,
          available: carStats[0]?.availableCars || 0,
          bookable: carStats[0]?.bookableCars || 0
        },
        bookings: {
          total: totalBookings,
          byStatus: bookingStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        }
      }
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch dashboard statistics', 500));
  }
};

module.exports = {
  getAllBookings,
  getAllUsers,
  getAllCars,
  deleteUser,
  deleteCar,
  getDashboardStats
};
