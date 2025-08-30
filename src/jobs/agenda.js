const Agenda = require('agenda');
const Booking = require('../models/bookingModel');
const Car = require('../models/CarModel');

const agenda = new Agenda({
  db: {
    address: process.env.MONGODB_URI || 'mongodb://localhost:27017/User-login',
    collection: 'jobs',
    options: { useUnifiedTopology: true }, 
  },
});

agenda.define('start booking', async (job) => {
  try {
    const { bookingId, carId } = job.attrs.data;

    await Booking.findByIdAndUpdate(bookingId, { status: 'ongoing' });
    await Car.findByIdAndUpdate(carId, { isAvailable: false });

    console.log(` Booking ${bookingId} started | Car ${carId} set unavailable`);
  } catch (err) {
    console.error(` Error in start booking job: ${err.message}`);
  }
});

agenda.define('end booking', async (job) => {
  try {
    const { bookingId, carId } = job.attrs.data;

    await Booking.findByIdAndUpdate(bookingId, { status: 'completed' });
    await Car.findByIdAndUpdate(carId, { isAvailable: true });

    console.log(` Booking ${bookingId} completed | Car ${carId} set available`);
  } catch (err) {
    console.error(` Error in end booking job: ${err.message}`);
  }
});

(async function () {
  try {
    await agenda.start();
    console.log(' Agenda started successfully');
  } catch (err) {
    console.error(' Failed to start Agenda:', err.message);
  }
})();

module.exports = agenda;
