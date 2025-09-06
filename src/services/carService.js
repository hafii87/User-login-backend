const carWrapper = require('../wrappers/carWrapper');
const { AppError } = require('../middleware/errorhandler');
const Car = require('../models/CarModel');

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
    const ongoingBookings = await carWrapper.getOngoingBookings(carId,'ongoing');
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

const findAvaliableCars = async ({ startTime, endTime, timezone }) => {
  try {
    const startUTC = convertToUTC(startTime, timezone);
    const endUTC = convertToUTC(endTime, timezone);
    
    const allCars = await Car.find({ isDeleted: false, isActive: true,  isBookable: true }).populate('owner', 'username email');

     const availableCars = [];
    for (let car of allCars) {
      const conflicts = await Booking.find({
        car: car._id,
        status: { $in: ['upcoming', 'ongoing'] },
        startTime: { $lt: endUTC },
        endTime: { $gt: startUTC }
      });
      
      if (conflicts.length === 0) {
        availableCars.push(car);
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
  findAvaliableCars
};
