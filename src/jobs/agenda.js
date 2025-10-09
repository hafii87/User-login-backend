const Agenda = require('agenda');
const Booking = require('../models/bookingModel');
const Car = require('../models/carModel');
const emailService = require('../services/emailService');
const { formatDateForDisplay } = require('../utils/timezoneUtils');

const agenda = new Agenda({
  db: {
    address: process.env.MONGODB_URI,
    collection: 'jobs',
  },
});

agenda.define('start booking', async (job) => {
  try {
    const { bookingId } = job.attrs.data;

    console.log(` Starting booking: ${bookingId}`);

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: 'ongoing', isStarted: true },
      { new: true }
    );

    if (!booking) {
      console.error(` Booking ${bookingId} not found`);
      return;
    }

    if (booking?.car) {
      await Car.findByIdAndUpdate(booking.car, { isAvailable: false });
      console.log(` Car ${booking.car} marked as unavailable`);
    }

    console.log(` Booking ${bookingId} started successfully`);
  } catch (err) {
    console.error(` Error in start booking job: ${err.message}`);
  }
});

agenda.define('end booking', async (job) => {
  try {
    const { bookingId } = job.attrs.data;

    console.log(` Ending booking: ${bookingId}`);

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: 'completed' },
      { new: true }
    );

    if (!booking) {
      console.error(` Booking ${bookingId} not found`);
      return;
    }

    if (booking?.car) {
      await Car.findByIdAndUpdate(booking.car, { isAvailable: true });
      console.log(` Car ${booking.car} marked as available`);
    }

    console.log(` Booking ${bookingId} completed successfully`);
  } catch (err) {
    console.error(` Error in end booking job: ${err.message}`);
  }
});

agenda.define('booking reminder start', async (job) => {
  const { bookingId } = job.attrs.data;
  
  try {
    console.log(` Processing start reminder for booking: ${bookingId}`);

    const booking = await Booking.findById(bookingId)
      .populate('car', 'make model year licenseNumber')
      .populate('user', 'email username');
    
    if (!booking) {
      console.log(` Booking ${bookingId} not found for start reminder`);
      return;
    }

    if (booking.status === 'cancelled') {
      console.log(` Booking ${bookingId} is cancelled, skipping start reminder`);
      return;
    }

    if (booking.remindersSent?.startReminder) {
      console.log(` Start reminder already sent for booking ${bookingId}`);
      return;
    }

    const userTimezone = booking.bookingTimezone || 'Asia/Karachi';
    const bookingWithFormatted = {
      ...booking.toObject(),
      startTimeFormatted: formatDateForDisplay(booking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(booking.endTime, userTimezone)
    };

    await emailService.sendBookingReminderStart(
      booking.user.email,
      bookingWithFormatted
    );

    await Booking.findByIdAndUpdate(bookingId, {
      'remindersSent.startReminder': true
    });

    console.log(` Start reminder sent for booking ${bookingId} to ${booking.user.email}`);
  } catch (error) {
    console.error(` Error sending start reminder for booking ${bookingId}:`, error.message);
  }
});

agenda.define('booking reminder end', async (job) => {
  const { bookingId } = job.attrs.data;
  
  try {
    console.log(` Processing end reminder for booking: ${bookingId}`);

    const booking = await Booking.findById(bookingId)
      .populate('car', 'make model year licenseNumber')
      .populate('user', 'email username');
    
    if (!booking) {
      console.log(` Booking ${bookingId} not found for end reminder`);
      return;
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      console.log(`  Booking ${bookingId} is ${booking.status}, skipping end reminder`);
      return;
    }

    if (booking.remindersSent?.endReminder) {
      console.log(`  End reminder already sent for booking ${bookingId}`);
      return;
    }

    const userTimezone = booking.bookingTimezone || 'Asia/Karachi';
    const bookingWithFormatted = {
      ...booking.toObject(),
      startTimeFormatted: formatDateForDisplay(booking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(booking.endTime, userTimezone)
    };

    await emailService.sendBookingReminderEnd(
      booking.user.email,
      bookingWithFormatted
    );

    await Booking.findByIdAndUpdate(bookingId, {
      'remindersSent.endReminder': true
    });

    console.log(` End reminder sent for booking ${bookingId} to ${booking.user.email}`);
  } catch (error) {
    console.error(` Error sending end reminder for booking ${bookingId}:`, error.message);
  }
});

agenda.on('ready', () => {
  console.log(' Agenda connected to database');
});

agenda.on('error', (error) => {
  console.error(' Agenda error:', error.message);
});

(async function () {
  try {
    await agenda.start();
    console.log(' Agenda started successfully');
    console.log(' Monitoring scheduled jobs...');
  } catch (err) {
    console.error(' Failed to start Agenda:', err.message);
  }
})();

process.on('SIGTERM', async () => {
  console.log('  SIGTERM received, shutting down Agenda gracefully...');
  await agenda.stop();
  console.log(' Agenda stopped');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('  SIGINT received, shutting down Agenda gracefully...');
  await agenda.stop();
  console.log(' Agenda stopped');
  process.exit(0);
});

module.exports = agenda;