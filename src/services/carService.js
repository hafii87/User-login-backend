const carWrapper = require('../wrappers/carWrapper');
const { AppError } = require('../middleware/errorhandler');

const addCar = async (carData) => {
  try {
    return await carWrapper.createCar(carData);
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

module.exports = {
  addCar,
  getCarsWithOwners,
  getCarById,
  updateCar,
  deleteCar,
};
