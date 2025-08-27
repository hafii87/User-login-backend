
const Car = require('../models/CarModel'); 

const createCar = async (carData) => {
  try {
    const newCar = new Car(carData);
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
    return await Car.findOne({ _id: id, isDeleted: false }).populate('owner', 'username email');
  } catch (error) {
    throw new Error(`Error fetching car by ID: ${error.message}`);
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

const  getCarBookings = async (carId, status = null) => {
  try {
    return await bookingWrapper.getCarBookings(carId, status);
  } catch (error) {
    throw new Error(`Error fetching car bookings: ${error.message}`);
  }
};

const extendBooking = async (bookingId, userId, newEndTime) => {
  try {
    const booking = await bookingWrapper.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    if (booking.user.toString() !== userId.toString()) {
      throw new Error('You can only extend your own bookings');
    }
    if (new Date(newEndTime) <= booking.endTime) {
      throw new Error('New end time must be after current end time');
    }

    const conflictingBookings = await bookingWrapper.findOverlapping(
      booking.car.id,
      booking.endTime,
      new Date(newEndTime)
    );
    if (conflictingBookings.length > 0) {
      throw new Error('The car is already booked for the extended time range');
    }

    booking.endTime = new Date(newEndTime);
    return await booking.save();
  } catch (error) {
    throw new Error(`Error extending booking: ${error.message}`);
  }
};  

const getBookingHistory = async (userId) => {
  try {
    return await bookingWrapper.getBookingHistory(userId);
  } catch (error) {
    throw new Error(`Error fetching booking history: ${error.message}`);
  }
};

const updatedBookings = async (userId) => {
  try {
    return await bookingWrapper.getUpdatedBookings(userId);
  } catch (error) {
    throw new Error(`Error fetching updated bookings: ${error.message}`);
  }
};

module.exports = {
  createCar, 
  getCarsWithOwners,
  getCarById,
  getCarsByOwner,
  updateCarByOwner,
  deleteCarByOwner, 
  getCarBookings,
  extendBooking,
  getBookingHistory,
  updatedBookings
};