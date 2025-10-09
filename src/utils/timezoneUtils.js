const moment = require('moment-timezone');      

const convertToUTC = (localTimestring, userTimezone) => {
    try{
        const utcTime = moment.tz(localTimestring, userTimezone).utc().toDate();
        return utcTime;
    } catch (error) {
        console.error('Error converting to UTC:', error);
        throw new Error('Failed to convert time to UTC');
    }
};

const convertFromUTC = (utcDate, userTimezone) => {
    try {
        const localTime = moment.utc(utcDate).tz(userTimezone).format();
        return localTime;
    } catch (error) {
        console.error('Error converting from UTC:', error);
        throw new Error('Failed to convert time from UTC');
    }
};

const isValidTimezone = (timezone) => {
    try{
        const zone = moment.tz.zone(timezone);
        return zone !== null;
    } catch  {
        console.error('Error validating timezone:');
        return false;
    }
};

const formatDateForDisplay = (date, timezone) => {
    try {
        return moment.tz(date, timezone).format('YYYY-MM-DD HH:mm:ss');
    } catch (error) {
        console.error('Error formatting date for display:', error);
        throw new Error('Failed to format date for display');
    }
};

const getCommonTimezone = () => {
    return [
        'UTC',
        'America/New_York',
        'Europe/London',
        'Asia/Karachi',
        'UTC+5'
    ];
};

module.exports = {
  convertToUTC,
  convertFromUTC,
  isValidTimezone,
  formatDateForDisplay,
  getCommonTimezone
};
