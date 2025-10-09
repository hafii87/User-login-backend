const carService = require('../services/carService');
const { AppError } = require('../middleware/errorhandler');

const addCar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const carData = req.body;
    if (!carData.make || !carData.model || !carData.year) {
      return next(new AppError('Please provide all required fields', 400));
    }

    const car = await carService.addCar(carData, userId);
    res.status(201).json({
      success: true,
      message: 'Car added successfully',
      data: car,
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to add car', 400));
  }
};

const getCarsWithOwners = async (req, res, next) => {
  try {
    const cars = await carService.getCarsWithOwners();
    res.status(200).json({
      success: true,
      count: cars.length,
      data: cars,
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch cars', 400));
  }
};

const viewCar = async (req, res, next) => {
  try {
    const car = await carService.getCarById(req.params.id);

    if (!car) {
      return next(new AppError('Car not found', 404));
    }

    res.status(200).json({
      success: true,
      data: car,
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch car', 400));
  }
};

const updateCar = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const updatedCar = await carService.updateCar(req.params.id, req.body, userId);

    if (!updatedCar) {
      return next(new AppError('Car not found or unauthorized', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Car updated successfully',
      data: updatedCar,
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to update car', 400));
  }
};

const deleteCar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deletedCar = await carService.deleteCar(req.params.id, userId);

    if (!deletedCar) {
      return next(new AppError('Car not found or unauthorized', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Car deleted successfully',
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to delete car', 400));
  }
};

const toggleCarBooking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const carId = req.params.id;
    const { isBookable } = req.body;

    const updatedCar = await carService.toggleCarBooking(carId, userId, isBookable);

    if (!updatedCar) {
      return next(new AppError('Car not found or unauthorized', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Car booking status updated successfully',
      data: updatedCar,
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to update car booking status', 400));
  }
};

const searchAvailableCars = async (req, res, next) => {
  try {
    const { startTime, endTime, timezone='Asia/Karachi' } = req.query;
    if (!startTime || !endTime) {
      return next(new AppError('Please provide startTime and endTime', 400));
    }

    const cars = await carService.findAvailableCars({
      startTime,
      endTime,
      timezone
    });

    res.status(200).json({
      success: true,
      count: cars.length,
      data: cars,
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to search available cars', 400));
  }
};

module.exports = {
  addCar,
  getCarsWithOwners,
  viewCar,
  updateCar,
  deleteCar,
  toggleCarBooking,
  searchAvailableCars
};
