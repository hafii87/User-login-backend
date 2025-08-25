const carWrapper = require('../wrappers/carWrapper');
const { AppError } = require('../middleware/errorhandler');

const addCar = async (carData, userId) => {
  if (!userId) throw new AppError('User ID is required to add a car', 400);
  return await carWrapper.addCar({ ...carData, owner: userId });
};

const getCarsWithOwners = async () => {
  return await carWrapper.getCarsWithOwners();
};

const getCarById = async (carId) => {
  return await carWrapper.getCarById(carId);
};

const updateCar = async (userId, carId, carData) => {
  return await carWrapper.updateCarByOwner(carId, userId, carData);
};

const deleteCar = async (userId, carId) => {
  return await carWrapper.softDeleteCar(carId, userId);
};

module.exports = {
  addCar,
  getCarsWithOwners,
  getCarById,
  updateCar,
  deleteCar,
};
