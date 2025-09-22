const Agenda = require('agenda');
const Booking = require('../models/bookingModel');
const Car = require('../models/CarModel'); 

const agenda = new Agenda({
  db: {
    address: process.env.MONGODB_URI,
    collection: 'jobs',
  },
});

agenda.define('start booking', async (job) => {
  try {
    const { bookingId } = job.attrs.data;

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: 'ongoing', isStarted: true },
      { new: true }
    );

    if (booking?.car) {
      await Car.findByIdAndUpdate(booking.car, { isAvailable: false });
    }
  } catch (err) {
    console.error(` Error in start booking job: ${err.message}`);
  }
});

agenda.define('end booking', async (job) => {
  try {
    const { bookingId } = job.attrs.data;

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: 'completed' },
      { new: true }
    );

    if (booking?.car) {
      await Car.findByIdAndUpdate(booking.car, { isAvailable: true });
    }
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