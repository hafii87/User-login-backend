const Car = require('../models/car');

const getCarInfo = async (req, res) => {
  try {
    const cars = await Car.find({ owner: req.user._id, isDeleted: false });
    res.status(200).json({
      message: 'Cars retrieved successfully',
      cars,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving cars', error: error.message });
  }
};

const addCar = async (req, res) => {
  const { make, model, year, price } = req.body;
  try {
    const newCar = new Car({ make, model, year, price, owner: req.user._id });
    await newCar.save();
    res.status(201).json({
      message: 'Car added successfully',
      car: newCar,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding car', error: error.message });
  }
};

const viewCar = async (req, res) => {
  try {
    const car = await Car.findOne({ _id: req.params.id, isDeleted: false }).populate('owner', 'username email');
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.status(200).json({
      message: 'Car retrieved successfully',
      car,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving car', error: error.message });
  }
};

const updateCar = async (req, res) => {
  const { make, model, year, price } = req.body;
  try {
    const car = await Car.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, isDeleted: false },
      { make, model, year, price },
      { new: true }
    );
    if (!car) {
      return res.status(404).json({ message: 'Car not found or unauthorized' });
    }
    res.status(200).json({
      message: 'Car updated successfully',
      car,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating car', error: error.message });
  }
};

const deleteCar = async (req, res) => {
  try {
    const car = await Car.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id },
      { new: true }
    );
    if (!car) {
      return res.status(404).json({ message: 'Car not found or unauthorized' });
    }
    res.status(200).json({
      message: 'Car deleted successfully (soft delete)',
      car,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting car', error: error.message });
  }
};

module.exports = {
  getCarInfo,
  addCar,
  viewCar,
  updateCar,
  deleteCar,
};
