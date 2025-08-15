const Car = require('../models/CarModel');

const createCar = (carData) => {
  return Car.create(carData);
};

const findAllByOwners = () => {
  return Car.find({ isDeleted : false }).populate('owner', 'username email');
};

const findById = (id) => {
  return Car.findOne({ _id: id, isDeleted: false }).populate('owner', 'username email');
};

const findByOwner = (ownerId) => {
  return Car.find({ owner: ownerId, isDeleted: false });
};

const findOneAndUpdateByOwner = (id, ownerId, update) => {
  return Car.findOneAndUpdate({ _id: id, owner: ownerId, isDeleted: false }, update, { new: true });
};

const softDeleteCar = (id, ownerId, deletedBy) => {
  return Car.findOneAndUpdate(
    { _id: id, owner: ownerId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), deletedBy },
    { new: true }
  );
};

module.exports = {
  createCar,
  findAllByOwners,
  findById,
  findByOwner,
  findOneAndUpdateByOwner,
  softDeleteCar
};