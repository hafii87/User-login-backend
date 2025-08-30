const Agenda = require('agenda');
const Booking = require('../models/bookingModel'); 
const Car = require('../models/CarModel');

const agenda = new Agenda({
  db: { 
    address: process.env.MONGODB_URI || 'mongodb://localhost:27017/User-login',
    collection: 'jobs'
  }
});

agenda.define('start booking', async (job) => { 
  const { bookingId, carId } = job.attrs.data;

  await Booking.findByIdAndUpdate(bookingId, { status: 'ongoing' });
  await Car.findByIdAndUpdate(carId, { isAvailable: false });

  console.log(`Booking ${bookingId} started, Car ${carId} is now unavailable`);
});

agenda.define('end booking', async (job) => { 
  const { bookingId, carId } = job.attrs.data;

  await Booking.findByIdAndUpdate(bookingId, { status: 'completed' });
  await Car.findByIdAndUpdate(carId, { isAvailable: true });

  console.log(`Booking ${bookingId} ended, Car ${carId} is now available`);
});

(async function startAgenda() {
  await agenda.start();
  console.log('Agenda started');
})();

module.exports = agenda;
