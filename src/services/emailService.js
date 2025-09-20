const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const testConnection = async () => {
  try {
    await transporter.verify();
    console.log(' Email service connected successfully');
  } catch (error) {
    console.error(' Email service failed:', error.message);
  }
};

const sendWelcomeEmail = async (userEmail, userData) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: ' Welcome to Car Booking System!',
      html: `
        <h2>Welcome ${userData.username}!</h2>
        <p>Your account has been created successfully.</p>
        <p><strong>Username:</strong> ${userData.username}</p>
        <p><strong>Email:</strong> ${userData.email}</p>
        <p>You can now start booking cars!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(' Welcome email sent to:', userEmail);
  } catch (error) {
    console.error(' Error sending welcome email:', error.message);
  }
};

const sendBookingConfirmation = async (userEmail, bookingData) => {
  try {
    console.log(' Sending booking confirmation to:', userEmail);
    
    const isGroupBooking = bookingData.group && bookingData.group.name;
    const groupInfo = isGroupBooking ? 
      `<p><strong> Group:</strong> ${bookingData.group.name}</p>` : 
      `<p><strong> Booking Type:</strong> Individual</p>`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: ' Car Booking Confirmed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;"> Booking Confirmed!</h2>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">📋 Booking Details</h3>
            <p><strong> Car:</strong> ${bookingData.car?.make || 'N/A'} ${bookingData.car?.model || 'N/A'} (${bookingData.car?.year || 'N/A'})</p>
            <p><strong> License Number:</strong> ${bookingData.car?.licenseNumber || 'Not Available'}</p>
            ${groupInfo}
            <p><strong> Start Time:</strong> ${bookingData.startTimeFormatted}</p>
            <p><strong> End Time:</strong> ${bookingData.endTimeFormatted}</p>
            <p><strong> Booking ID:</strong> ${bookingData.id}</p>
            <p><strong> Status:</strong> ${bookingData.status}</p>
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
            <p style="margin: 0;"><strong> Next Steps:</strong></p>
            <ul style="margin: 10px 0 0 0;">
              <li>Be ready 15 minutes before your start time</li>
              <li>Bring your driving license</li>
              <li>Contact support if you need assistance</li>
            </ul>
          </div>
          
          <p style="margin-top: 20px;">Thank you for using our car booking service!</p>
          <p><strong>Have a safe journey! 💨</strong></p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(' Booking confirmation sent to:', userEmail, 'MessageID:', result.messageId);
  } catch (error) {
    console.error(' Error sending booking email:', error.message);
    console.error(' Full error:', error);
  }
};

const sendCancellationEmail = async (userEmail, bookingData) => {
  try {
    console.log(' Sending cancellation email to:', userEmail);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: 'Booking Cancelled',
      html: `
        <h2>Booking Cancelled</h2>
        <p>Your booking has been cancelled successfully.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
          <p><strong>Car:</strong> ${bookingData.car?.make || 'N/A'} ${bookingData.car?.model || 'N/A'}</p>
          <p><strong>Booking ID:</strong> ${bookingData.id}</p>
          <p><strong>Original Start Time:</strong> ${bookingData.startTimeFormatted}</p>
        </div>
        <p>You can book again anytime!</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(' Cancellation email sent to:', userEmail, 'MessageID:', result.messageId);
  } catch (error) {
    console.error(' Error sending cancellation email:', error.message);
    console.error(' Full error:', error);
  }
};

const sendEmailVerification = async (userEmail, userData) => {
  try {
    const verificationUrl = `http://localhost:5000/api/users/verify-email/${userData.verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: ' Verify Your Email - Car Booking System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Welcome ${userData.username}! 👋</h2>
          
          <p>Thank you for registering with our Car Booking System!</p>
          
          <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📧 Email Verification Required</h3>
            <p>Please click the button below to verify your email address:</p>
            
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">
              ✅ Verify Email Address
            </a>
            
            <p><small>Or copy this link: ${verificationUrl}</small></p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <p><strong> Important:</strong> You must verify both your email and phone number before you can book cars.</p>
          </div>
          
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(' Email verification sent to:', userEmail);
  } catch (error) {
    console.error(' Error sending email verification:', error.message);
  }
};

module.exports = {
  testConnection,
  sendWelcomeEmail,
  sendEmailVerification,
  sendBookingConfirmation,
  sendCancellationEmail
};