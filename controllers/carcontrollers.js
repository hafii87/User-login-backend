const mongoose = require('mongoose');
const Car = require('../models/car');

const getCarInfo = async (req, res) => {
  try {
    
    const cars = await Car.find({ owner: req.user.id, isDeleted: false });
    res.status(200).json({
      message: 'Cars retrieved successfully',
      cars,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving cars', error: error.message });
  }
};

const addCar = async (req, res) => {
  try {
    console.log("Inside addCar, req.user:", req.user);
    if (!req.user || !req.user.id) {
      return res.status(400).json({ message: 'User info missing (req.user.id not found)' });
    }

    const ownerId = mongoose.Types.ObjectId(req.user.id);
    const { make, model, year, price } = req.body;

    if (!make || !model || !year || !price) {
      return res.status(400).json({ message: 'Missing car details in request body' });
    }

    const newCar = new Car({
      owner: ownerId,
      make,
      model,
      year,
      price,
    });

    console.log("New Car document to save:", newCar);

    const savedCar = await newCar.save();

    console.log("Car saved successfully:", savedCar);

    res.status(201).json({
      message: 'Car added successfully',
      car: savedCar,
    });
  } catch (error) {
    console.error("Error in addCar:", error);
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
      { _id: req.params.id, owner: req.user.id, isDeleted: false },
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
      { _id: req.params.id, owner: req.user.id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user.id },
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
