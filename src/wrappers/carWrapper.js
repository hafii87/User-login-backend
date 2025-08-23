const Car = require('../models/carModel');

const addCar = async (carData) => {
  try {
    const newCar = new Car(carData);
    return await newCar.save();
  } catch (error) {
    throw new Error(`Error adding car: ${error.message}`);
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

const updateCarByOwner = async (id, ownerId, update) => {
  try {
    return await Car.findOneAndUpdate(
      { _id: id, owner: ownerId, isDeleted: false },
      update,
      { new: true, runValidators: true }
    );
  } catch (error) {
    throw new Error(`Error updating car: ${error.message}`);
  }
};

const softDeleteCar = async (id, ownerId, deletedBy) => {
  try {
    return await Car.findOneAndUpdate(
      { _id: id, owner: ownerId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), deletedBy },
      { new: true }
    );
  } catch (error) {
    throw new Error(`Error deleting car: ${error.message}`);
  }
};

module.exports = {
  addCar,
  getCarsWithOwners,
  getCarById,
  getCarsByOwner,
  updateCarByOwner,
  softDeleteCar,
};
