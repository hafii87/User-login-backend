const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, '../../config/google-calendar-token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../../config/google-calendar-credentials.json');

let auth = null;

const authorize = async () => {
  try {
    if (auth) return auth;

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (fs.existsSync(TOKEN_PATH)) {
      const token = fs.readFileSync(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(token));
      auth = oAuth2Client;
      return oAuth2Client;
    } else {
      throw new Error('Google Calendar token not found. Please authorize the application first.');
    }
  } catch (error) {
    console.error('Error authorizing Google Calendar:', error.message);
    throw error;
  }
};

const createCalendarEvent = async (bookingData) => {
  try {
    const authClient = await authorize();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const event = {
      summary: `Car Booking: ${bookingData.car.make} ${bookingData.car.model}`,
      description: `Booking ID: ${bookingData._id}\nLicense: ${bookingData.car.licenseNumber}\nStatus: ${bookingData.status}`,
      start: {
        dateTime: new Date(bookingData.startTime).toISOString(),
        timeZone: bookingData.bookingTimezone || 'Asia/Karachi',
      },
      end: {
        dateTime: new Date(bookingData.endTime).toISOString(),
        timeZone: bookingData.bookingTimezone || 'Asia/Karachi',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 10 },
          { method: 'popup', minutes: 10 },
        ],
      },
      attendees: [
        { email: bookingData.userEmail }
      ],
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all',
    });

    return {
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
    };
  } catch (error) {
    console.error('Error creating calendar event:', error.message);
    throw error;
  }
};

const updateCalendarEvent = async (eventId, bookingData) => {
  try {
    const authClient = await authorize();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const event = {
      summary: `Car Booking: ${bookingData.car.make} ${bookingData.car.model}`,
      description: `Booking ID: ${bookingData._id}\nLicense: ${bookingData.car.licenseNumber}\nStatus: ${bookingData.status}`,
      start: {
        dateTime: new Date(bookingData.startTime).toISOString(),
        timeZone: bookingData.bookingTimezone || 'Asia/Karachi',
      },
      end: {
        dateTime: new Date(bookingData.endTime).toISOString(),
        timeZone: bookingData.bookingTimezone || 'Asia/Karachi',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 10 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: event,
      sendUpdates: 'all',
    });

    return {
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
    };
  } catch (error) {
    console.error('Error updating calendar event:', error.message);
    throw error;
  }
};

const deleteCalendarEvent = async (eventId) => {
  try {
    const authClient = await authorize();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'all',
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event:', error.message);
    throw error;
  }
};

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  authorize
};