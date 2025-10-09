const carWrapper = require('../wrappers/carWrapper');
const { AppError } = require('../middleware/errorhandler');
const Car = require('../models/carModel');
const Booking = require('../models/bookingModel');
const { convertToUTC, isValidTimezone } = require('../utils/timezoneUtils');

const addCar = async (carData, userId) => {
  try {
    const carwithowner={
      ...carData, owner: userId
    }
    return await carWrapper.createCar(carwithowner);
  } catch (error) {
    throw new Error(`Error adding car: ${error.message}`);
  }
};

const getCarsWithOwners = async () => {
  try {
    return await carWrapper.getCarsWithOwners();
  } catch (error) {
    throw new Error(`Error fetching cars with owners: ${error.message}`);
  }
};

const getCarById = async (carId) => {
  try {
    return await carWrapper.getCarById(carId);
  } catch (error) {
    throw new Error(`Error fetching car by ID: ${error.message}`);
  }
};

const updateCar = async (carId, updateData, userId) => {
  try {
    return await carWrapper.updateCarByOwner(carId, userId, updateData);
  } catch (error) {
    throw new Error(`Error updating car: ${error.message}`);
  }
};

const deleteCar = async (carId, userId) => {
  try {
    return await carWrapper.deleteCarByOwner(carId, userId);
  } catch (error) {
    throw new Error(`Error deleting car: ${error.message}`);
  }
};

const toggleCarBooking = async (carId, userId, isBookable) => {
  try {
    const ongoingBookings = await Booking.find({ car: carId, status: 'ongoing' });
    if (!isBookable && ongoingBookings.length > 0) {
      throw new Error('Cannot change booking status while there are ongoing bookings');
    }
    return await carWrapper.toggleCarBooking(carId, userId, {
      isBookable,
      updatedAt: new Date()
    });
  } catch (error) {
    throw new Error(`Error toggling car booking: ${error.message}`);
  }
};

const findAvailableCars = async ({ startTime, endTime, timezone }) => {
  try {
    if (!isValidTimezone(timezone)) {
      throw new Error('Invalid timezone provided');
    }

    const startUTC = convertToUTC(startTime, timezone);
    const endUTC = convertToUTC(endTime, timezone);
    
    if (new Date(startTime) >= new Date(endTime)) {
      throw new Error('End time must be after start time');
    }

    if (new Date(startTime) < new Date()) {
      throw new Error('Start time must be in the future');
    }

    const allCars = await Car.find({ 
      isDeleted: false, 
      isActive: true,  
      isBookable: true 
    }).populate('owner', 'username email');

    const availableCars = [];
    
    for (let car of allCars) {
      const preferences = car.bookingPreferences || {};
      
      const durationHours = (endUTC - startUTC) / (1000 * 60 * 60);
      if (durationHours < (preferences.minBookingHours || 1)) {
        continue;
      }
      
      const durationDays = durationHours / 24;
      if (durationDays > (preferences.maxBookingDays || 7)) {
        continue;
      }

      const advanceDays = (startUTC - new Date()) / (1000 * 60 * 60 * 24);
      if (advanceDays > (preferences.advanceBookingDays || 30)) {
        continue;
      }
      
      if (preferences.blackoutDates && preferences.blackoutDates.length > 0) {
        const isInBlackout = preferences.blackoutDates.some(blackout => {
          return startUTC < new Date(blackout.endDate) && endUTC > new Date(blackout.startDate);
        });
        if (isInBlackout) {
          continue;
        }
      }
      
      const conflicts = await Booking.find({
        car: car._id,
        status: { $in: ['upcoming', 'ongoing'] },
        startTime: { $lt: endUTC },
        endTime: { $gt: startUTC }
      });
      
      if (conflicts.length === 0) {
        availableCars.push({
          ...car.toObject(),
          availabilityChecked: true,
          searchTimezone: timezone,
          searchStartTime: startTime,
          searchEndTime: endTime
        });
      }
    }
    
    return availableCars;
  } catch (error) {
    throw new Error(`Error finding available cars: ${error.message}`);
  }
};

module.exports = {
  addCar,
  getCarsWithOwners,
  getCarById,
  updateCar,
  deleteCar,
  toggleCarBooking,
  findAvailableCars
};
