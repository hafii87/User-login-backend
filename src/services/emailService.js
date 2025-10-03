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
      `<p><strong> Booking Type:</strong> ${bookingData.bookingType.charAt(0).toUpperCase() + bookingData.bookingType.slice(1)}</p>`;
    
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

const sendBusinessBookingConfirmation = async (email, bookingData) => {
  const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .business-badge { background: #1e40af; color: white; padding: 4px 12px; border-radius: 4px; }
        .booking-details { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h2>Business Booking Confirmed</h2>
      <span class="business-badge">BUSINESS ACCOUNT</span>
      
      <div class="booking-details">
        <h3>Booking Details</h3>
        <p><strong>Booking ID:</strong> ${bookingData._id}</p>
        <p><strong>Vehicle:</strong> ${bookingData.car.make} ${bookingData.car.model}</p>
        <p><strong>License Number:</strong> ${bookingData.car.licenseNumber}</p>
        <p><strong>Start:</strong> ${bookingData.startTimeFormatted}</p>
        <p><strong>End:</strong> ${bookingData.endTimeFormatted}</p>
      </div>
      
      <p><strong>Payment:</strong> No payment required - Business account</p>
      <p><strong>Invoice:</strong> Monthly invoice will be sent at end of billing cycle</p>
      
      <p>For business account queries, contact: business@yourcompany.com</p>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Business Booking Confirmed - No Payment Required',
    html: emailContent
  });
};

const sendPrivateBookingConfirmation = async (email, bookingData) => {
  const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .private-badge { background: #059669; color: white; padding: 4px 12px; border-radius: 4px; }
        .booking-details { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h2>Booking Confirmed</h2>
      <span class="private-badge">PRIVATE BOOKING</span>
      
      <div class="booking-details">
        <h3>Booking Details</h3>
        <p><strong>Booking ID:</strong> ${bookingData._id}</p>
        <p><strong>Vehicle:</strong> ${bookingData.car.make} ${bookingData.car.model}</p>
        <p><strong>License Number:</strong> ${bookingData.car.licenseNumber}</p>
        <p><strong>Start:</strong> ${bookingData.startTimeFormatted}</p>
        <p><strong>End:</strong> ${bookingData.endTimeFormatted}</p>
        <p><strong>Total Amount:</strong> $${bookingData.totalAmount}</p>
      </div>
      
      <p><strong>Payment Status:</strong> ${bookingData.paymentStatus}</p>
      
      <p>Thank you for your booking!</p>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Booking Confirmed',
    html: emailContent
  });
};

const sendPaymentConfirmation = async (email, paymentData) => {
  const emailContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <h2>Payment Received</h2>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Payment Details</h3>
        <p><strong>Booking ID:</strong> ${paymentData.bookingId}</p>
        <p><strong>Amount Paid:</strong> $${paymentData.amount}</p>
        <p><strong>Payment Date:</strong> ${new Date(paymentData.paymentDate).toLocaleString()}</p>
        <p><strong>Vehicle:</strong> ${paymentData.carDetails}</p>
        <p><strong>Booking Period:</strong> ${new Date(paymentData.startTime).toLocaleString()} - ${new Date(paymentData.endTime).toLocaleString()}</p>
      </div>
      
      <p>Your payment has been successfully processed. Your booking is confirmed!</p>
      <p>Receipt will be available in your account dashboard.</p>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Payment Confirmed - Booking Active',
    html: emailContent
  });
};

const sendPaymentFailedEmail = async (email, errorData) => {
  const emailContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <h2 style="color: #dc2626;">Payment Failed</h2>
      
      <p>We were unable to process your payment for booking <strong>${errorData.bookingId}</strong>.</p>
      
      <p><strong>Error:</strong> ${errorData.errorMessage}</p>
      
      <p>Please try again or use a different payment method.</p>
      <p>Your booking will be held for 24 hours pending payment.</p>
      
      <a href="${process.env.FRONTEND_URL}/bookings/${errorData.bookingId}/payment" 
         style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
        Retry Payment
      </a>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Payment Failed - Action Required',
    html: emailContent
  });
};

const generateInvoice = async (bookingData) => {
  
  return {
    invoiceNumber: `INV-${bookingData._id}-${Date.now()}`,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
    items: [
      {
        description: `Car Rental: ${bookingData.car.make} ${bookingData.car.model}`,
        quantity: 1,
        unitPrice: bookingData.totalAmount,
        total: bookingData.totalAmount
      }
    ],
    subtotal: bookingData.totalAmount,
    tax: 0,
    total: bookingData.totalAmount
  };
};

module.exports = {
  testConnection,
  sendWelcomeEmail,
  sendEmailVerification,
  sendBookingConfirmation,
  sendCancellationEmail,
  sendBusinessBookingConfirmation,
  sendPrivateBookingConfirmation,
  sendPaymentConfirmation,
  sendPaymentFailedEmail,
  generateInvoice
};
