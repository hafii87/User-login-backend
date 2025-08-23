const carService = require('../services/carService');
console.log('carService:', carService);
console.log('carService keys:', Object.keys(carService));
const { AppError } = require('../middleware/errorhandler');

const addCar = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return next(new AppError('User authentication failed', 401));
    }

    const car = await carService.addCar(req.body, req.user._id); 
    res.status(201).json({
      message: 'Car added successfully',
      car,
    });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

const getCarsWithOwners = async (req, res, next) => {
  try {
    const cars = await carService.getCarsWithOwners();
    res.status(200).json(cars);
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

const viewCar = async (req, res, next) => {
  try {
    const car = await carService.getCarById(req.params.id);
    if (!car) {
      return next(new AppError('Car not found', 404));
    }
    res.status(200).json(car);
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

const updateCar = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return next(new AppError('User authentication failed', 401));
    }

    const updatedCar = await carService.updateCar(req.user._id, req.params.id, req.body); 
    if (!updatedCar) {
      return next(new AppError('Car not found or unauthorized', 404));
    }

    res.status(200).json({
      message: 'Car updated successfully',
      car: updatedCar,
    });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

const deleteCar = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return next(new AppError('User authentication failed', 401));
    }

    const deleted = await carService.deleteCar(req.user._id, req.params.id);
    if (!deleted) {
      return next(new AppError('Car not found or unauthorized', 404));
    }

    res.status(200).json({ message: 'Car deleted successfully' });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

module.exports = {
  addCar,
  getCarsWithOwners,
  viewCar,
  updateCar,
  deleteCar,
};
