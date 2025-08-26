
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

module.exports = {
  createCar, 
  getCarsWithOwners,
  getCarById,
  getCarsByOwner,
  updateCarByOwner,
  deleteCarByOwner, 
};