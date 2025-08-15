const carWrapper = require('../wrappers/carWrapper');

let carSchema;
try {
  carSchema = require('../validators/carValidators') || {};
} catch (e) {
  carSchema = null;
}

const addCar = async (data, userId) => {
  if (carSchema) {
    const { error } = carSchema.validate(data);
    if (error) throw Object.assign(new Error(error.details[0].message), { status: 400 });
  } else {
    const { make, model, year, price } = data;
    if (!make || !model || !year || price === undefined) {
      throw Object.assign(new Error('Make, model, year, and price are required'), { status: 400 });
    }
  }
  const tocreate = { ...data, owner: userId };
  const created = await carWrapper.createCar(tocreate);
  return created;
};

const getCarsWithOwners = async () => {
  return await carWrapper.findAllByOwners();
};

const getCarById = async (id) => {
  return await carWrapper.findById(id);
};

const updateCar = async (ownerId, carId, updateData) => {
  const allowed = {};
  ['make', 'model', 'year', 'price', 'deletedAt'].forEach(k => {
    if (updateData[k] !== undefined) {
      allowed[k] = updateData[k];
    }
  });
  if (allowed.deletedAt) allowed.deletedAt = new Date(allowed.deletedAt);

  const updated = await carWrapper.findOneAndUpdateByOwner(carId, ownerId, allowed);
  if (!updated) throw Object.assign(new Error('Car not found or unauthorized'), { status: 404 });
  return updated;
};

const deleteCar = async (ownerId, carId) => {
  const deleted = await carWrapper.softDeleteCar(carId, ownerId, ownerId);
  if (!deleted) throw Object.assign(new Error('Car not found or unauthorized'), { status: 404 });
  return deleted;
};

module.exports = {
  addCar,
  getCarsWithOwners,
  getCarById,
  updateCar,
  deleteCar
};