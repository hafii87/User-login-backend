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
        moment.tz.zone(timezone);
    } catch  {
        console.error('Error validating timezone:');
        return false;
    }
};

const getCommonTimezone = () => {
    return[
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
  getCommonTimezone
};
