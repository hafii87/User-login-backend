const Car = require('../models/carModel'); 
const Booking = require('../models/bookingModel'); 
const mongoose = require('mongoose');

const createCar = async (carData) => {
  try {
    const newCar = new Car({
      ...carData,
      isAvailable: typeof carData.isAvailable === 'boolean' ? carData.isAvailable : true,
      isBookable: typeof carData.isBookable === 'boolean' ? carData.isBookable : true,
      isDeleted: false,   
      deletedAt: null,
      deletedBy: null
    });
    return await newCar.save();
  } catch (error) {
    throw new Error(`Error creating car: ${error.message}`);
  }
};

const getCarsWithOwners = async () => {
  try {
    return await Car.find({ isDeleted: false }).populate('owner', 'username email');
  } catch (error) {
    throw new Error(`Error fetching cars: ${error.message}`);
  }
};

const getCarById = async (id) => {
  try {
    console.log('CarWrapper - Searching for car ID:', id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid car ID format: ${id}`);
    }

  const car = await Car.findOne({ _id: id, isDeleted: false })
      .populate('owner', 'username email');

    console.log('CarWrapper - Car found:', car ? `${car.make} ${car.model}` : 'null');
    if (!car) {
      throw new Error(`Car with ID ${id} not found or has been deleted`);
    }
    return car;
  } catch (error) {
    console.error('CarWrapper - Error:', error.message);
    throw error;
  }
};

const getCarsByOwner = async (ownerId) => {
  try {
    return await Car.find({ owner: ownerId, isDeleted: false });
  } catch (error) {
    throw new Error(`Error fetching cars by owner: ${error.message}`);
  }
};

const updateCarByOwner = async (carId, ownerId, update) => {
  try {
    return await Car.findOneAndUpdate(
      { _id: carId, owner: ownerId, isDeleted: false },
      update,
      { new: true, runValidators: true }
    );
  } catch (error) {
    throw new Error(`Error updating car: ${error.message}`);
  }
};

const deleteCarByOwner = async (carId, ownerId) => { 
  try {
    return await Car.findOneAndUpdate(
      { _id: carId, owner: ownerId, isDeleted: false },
      { 
        isDeleted: true, 
        deletedAt: new Date(), 
        deletedBy: ownerId 
      },
      { new: true }
    );
  } catch (error) {
    throw new Error(`Error deleting car: ${error.message}`);
  }
};

const getOngoingBookings = async (carId, status = 'ongoing') => {
  try {
    return await Booking.find({ 
      car: carId, 
      status: status 
    });
  } catch (error) {
    throw new Error(`Error fetching ongoing bookings: ${error.message}`);
  }
};

const toggleCarBooking = async (carId, userId, updateData) => {
  try {
    return await Car.findOneAndUpdate(
      { _id: carId, owner: userId, isDeleted: false },
      updateData,
      { new: true, runValidators: true }
    );
  } catch (error) {
    throw new Error(`Error toggling car booking status: ${error.message}`);
  }
};

module.exports = {
  createCar, 
  getCarsWithOwners,
  getCarById,
  getCarsByOwner,
  updateCarByOwner,
  deleteCarByOwner, 
  getOngoingBookings,
  toggleCarBooking
};
