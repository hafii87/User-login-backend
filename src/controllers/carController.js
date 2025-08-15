const carService = require('../services/carService');

const addCar = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User authentication failed' });
    }
    const car = await carService.addCar(req.body, req.user._id);
    res.status(201).json(car);
  } catch (error) {
    console.error('Error adding car:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getCarsWithOwners = async (req, res) => {
  try {
    const cars = await carService.getCarsWithOwners();
    res.status(200).json(cars);
  } catch (error) {
    console.error('Error fetching cars:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const viewCar = async (req, res) => {
  try {
    const car = await carService.getCarById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    res.status(200).json(car);
  } catch (error) {
    console.error('Error viewing car:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateCar = async (req, res) => {
  try {
    const updated = await carService.updateCar(req.user._id, req.params.id, req.body);
    res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating car:', error);
    res.status(400).json({ message: error.message });
  }
};

const deleteCar = async (req, res) => {
  try {
    await carService.deleteCar(req.user._id, req.params.id);
    res.status(200).json({ message: 'Car deleted successfully' });
  } catch (error) {
    console.error('Error deleting car:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addCar,
  getCarsWithOwners,
  viewCar,
  updateCar,
  deleteCar,
};
