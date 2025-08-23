const Car = require('../models/carModel');
const { AppError } = require('../middleware/errorhandler');

const addCar = async (carData) => {
  try {
    return await Car.create(carData);
  } catch (err) {
    throw new AppError(`Failed to create car: ${err.message}`, 400);
  }
};

const getCarsWithOwners = async () => {
  try {
    return await Car.find({ isDeleted: false }).populate('owner', 'username email');
  } catch (err) {
    throw new AppError(`Error fetching cars: ${err.message}`, 500);
  }
};

const getCarById = async (id) => {
  try {
    const car = await Car.findOne({ _id: id, isDeleted: false }).populate('owner', 'username email');
    if (!car) throw new AppError('Car not found', 404);
    return car;
  } catch (err) {
    if (err instanceof AppError) throw err; 
    throw new AppError(`Error finding car: ${err.message}`, 500);
  }
};

const getCarsByOwner = async (ownerId) => {
  try {
    return await Car.find({ owner: ownerId, isDeleted: false });
  } catch (err) {
    throw new AppError(`Error finding cars by owner: ${err.message}`, 500);
  }
};

const updateCarByOwner = async (id, ownerId, update) => {
  try {
    const updated = await Car.findOneAndUpdate(
      { _id: id, owner: ownerId, isDeleted: false },
      update,
      { new: true, runValidators: true }
    );
    if (!updated) throw new AppError('Car not found or unauthorized', 404);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to update car: ${err.message}`, 400);
  }
};

const softDeleteCar = async (id, ownerId, deletedBy) => {
  try {
    const deleted = await Car.findOneAndUpdate(
      { _id: id, owner: ownerId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), deletedBy },
      { new: true }
    );
    if (!deleted) throw new AppError('Car not found or unauthorized', 404);
    return deleted;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to delete car: ${err.message}`, 400);
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
