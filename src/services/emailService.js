const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html
  };
  const result = await transporter.sendMail(mailOptions);
  console.log(`Email sent to ${to} (MessageID: ${result.messageId})`);
  return result;
};

const testConnection = async () => {
  await transporter.verify();
  console.log('Email service connected successfully');
};

const sendWelcomeEmail = async (userEmail, userData) => {
  return await sendEmail({
    to: userEmail,
    subject: 'Welcome to Car Booking System!',
    html: `
      <h2>Welcome ${userData.username}!</h2>
      <p>Your account has been created successfully.</p>
      <p><strong>Username:</strong> ${userData.username}</p>
      <p><strong>Email:</strong> ${userData.email}</p>
      <p>You can now start booking cars!</p>
    `
  });
};

const sendBookingConfirmation = async (userEmail, bookingData) => {
  const isGroupBooking = bookingData.group && bookingData.group.name;
  const groupInfo = isGroupBooking ? 
    `<p><strong>Group:</strong> ${bookingData.group.name}</p>` : 
    `<p><strong>Booking Type:</strong> ${bookingData.bookingType.charAt(0).toUpperCase() + bookingData.bookingType.slice(1)}</p>`;
  return await sendEmail({
    to: userEmail,
    subject: 'Car Booking Confirmed!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Booking Confirmed!</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">📋 Booking Details</h3>
          <p><strong>Car:</strong> ${bookingData.car?.make || 'N/A'} ${bookingData.car?.model || 'N/A'} (${bookingData.car?.year || 'N/A'})</p>
          <p><strong>License Number:</strong> ${bookingData.car?.licenseNumber || 'Not Available'}</p>
          ${groupInfo}
          <p><strong>Start Time:</strong> ${bookingData.startTimeFormatted}</p>
          <p><strong>End Time:</strong> ${bookingData.endTimeFormatted}</p>
          <p><strong>Booking ID:</strong> ${bookingData.id}</p>
          <p><strong>Status:</strong> ${bookingData.status}</p>
        </div>
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
          <p style="margin: 0;"><strong>Next Steps:</strong></p>
          <ul style="margin: 10px 0 0 0;">
            <li>Be ready 15 minutes before your start time</li>
            <li>Bring your driving license</li>
            <li>Contact support if you need assistance</li>
          </ul>
        </div>
        <p style="margin-top: 20px;">Thank you for using our car booking service!</p>
        <p><strong>Have a safe journey! 💨</strong></p>
      </div>
    `
  });
};

const sendCancellationEmail = async (userEmail, bookingData) => {
  const refundInfo = bookingData.paymentStatus === 'refunded' ? `
    <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50; margin-top: 15px;">
      <p style="margin: 0;"><strong>✅ Refund Processed</strong></p>
      <p style="margin: 5px 0 0 0;"><strong>Amount:</strong> ${bookingData.refundedAmount?.toFixed(2) || '0.00'}</p>
      <p style="margin: 5px 0 0 0;">The refund will appear in your account within 5-10 business days.</p>
    </div>
  ` : bookingData.paymentStatus === 'pending' ? `
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-top: 15px;">
      <p style="margin: 0;"><strong>💳 No Payment Required</strong></p>
      <p style="margin: 5px 0 0 0;">Your booking was cancelled before payment was completed.</p>
    </div>
  ` : '';

  return await sendEmail({
    to: userEmail,
    subject: 'Booking Cancelled Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Booking Cancelled</h2>
        <p>Your booking has been cancelled successfully.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
          <p><strong>Car:</strong> ${bookingData.car?.make || 'N/A'} ${bookingData.car?.model || 'N/A'}</p>
          <p><strong>License Number:</strong> ${bookingData.car?.licenseNumber || 'Not Available'}</p>
          <p><strong>Booking ID:</strong> ${bookingData.id || bookingData._id}</p>
          <p><strong>Original Start Time:</strong> ${bookingData.startTimeFormatted || 'N/A'}</p>
          <p><strong>Original End Time:</strong> ${bookingData.endTimeFormatted || 'N/A'}</p>
          <p><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">Cancelled</span></p>
        </div>
        ${refundInfo}
        <p style="margin-top: 20px;">You can book again anytime!</p>
        <p style="color: #666; font-size: 14px;">If you have any questions, please contact our support team.</p>
      </div>
    `
  });
};

const sendEmailVerification = async (userEmail, userData) => {
  const verificationUrl = `http://localhost:5000/api/users/verify-email/${userData.verificationToken}`;
  return await sendEmail({
    to: userEmail,
    subject: 'Verify Your Email - Car Booking System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Welcome ${userData.username}! 👋</h2>
        <p>Thank you for registering with our Car Booking System!</p>
        <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>📧 Email Verification Required</h3>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">
            ✅ Verify Email Address
          </a>
          <p><small>Or copy this link: ${verificationUrl}</small></p>
        </div>
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
          <p><strong>Important:</strong> You must verify both your email and phone number before you can book cars.</p>
        </div>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    `
  });
};

const sendBusinessBookingConfirmation = async (email, bookingData) => {
  return await sendEmail({
    to: email,
    subject: 'Business Booking Confirmed - No Payment Required',
    html: `
      <h2>Business Booking Confirmed</h2>
      <span style="background: #1e40af; color: white; padding: 4px 12px; border-radius: 4px;">BUSINESS ACCOUNT</span>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
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
    `
  });
};

const sendPrivateBookingConfirmation = async (email, bookingData) => {
  return await sendEmail({
    to: email,
    subject: 'Booking Confirmed',
    html: `
      <h2>Booking Confirmed</h2>
      <span style="background: #059669; color: white; padding: 4px 12px; border-radius: 4px;">PRIVATE BOOKING</span>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
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
    `
  });
};

const sendPaymentConfirmation = async (email, paymentData) => {
  return await sendEmail({
    to: email,
    subject: 'Payment Confirmed - Booking Active',
    html: `
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
    `
  });
};

const sendPaymentFailedEmail = async (email, errorData) => {
  return await sendEmail({
    to: email,
    subject: 'Payment Failed - Action Required',
    html: `
      <h2 style="color: #dc2626;">Payment Failed</h2>
      <p>We were unable to process your payment for booking <strong>${errorData.bookingId}</strong>.</p>
      <p><strong>Error:</strong> ${errorData.errorMessage}</p>
      <p>Please try again or use a different payment method.</p>
      <p>Your booking will be held for 24 hours pending payment.</p>
      <a href="${process.env.FRONTEND_URL}/bookings/${errorData.bookingId}/payment" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
        Retry Payment
      </a>
    `
  });
};

const sendRefundConfirmation = async (email, refundData) => {
  return await sendEmail({
    to: email,
    subject: 'Refund Processed Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Refund Processed</h2>
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
          <h3 style="color: #333; margin-top: 0;">✅ Refund Details</h3>
          <p><strong>Booking ID:</strong> ${refundData.bookingId}</p>
          <p><strong>Refund Amount:</strong> $${refundData.amount?.toFixed(2) || '0.00'}</p>
          <p><strong>Refund Date:</strong> ${new Date(refundData.refundedAt).toLocaleString()}</p>
          <p><strong>Reason:</strong> ${refundData.refundReason || 'Booking cancelled before start time'}</p>
        </div>
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
          <p style="margin: 0;"><strong>Processing Time:</strong></p>
          <p style="margin: 5px 0 0 0;">The refund will appear in your account within 5-10 business days depending on your payment provider.</p>
        </div>
        <p style="margin-top: 20px;">If you have any questions about your refund, please contact our support team.</p>
      </div>
    `
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

const sendBookingReminderStart = async (userEmail, bookingData) => {
  return await sendEmail({
    to: userEmail,
    subject: 'Booking Starting Soon - 10 Minutes Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Your Booking Starts in 10 Minutes</h2>
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
          <p><strong>Reminder:</strong> Your car booking will begin shortly!</p>
        </div>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Booking Details</h3>
          <p><strong>Car:</strong> ${bookingData.car?.make || 'N/A'} ${bookingData.car?.model || 'N/A'} (${bookingData.car?.year || 'N/A'})</p>
          <p><strong>License Number:</strong> ${bookingData.car?.licenseNumber || 'Not Available'}</p>
          <p><strong>Start Time:</strong> ${bookingData.startTimeFormatted}</p>
          <p><strong>End Time:</strong> ${bookingData.endTimeFormatted}</p>
          <p><strong>Booking ID:</strong> ${bookingData.id}</p>
        </div>
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
          <p style="margin: 0;"><strong>Next Steps:</strong></p>
          <ul style="margin: 10px 0 0 0;">
            <li>Head to the pickup location</li>
            <li>Have your driving license ready</li>
            <li>Contact support if you need assistance</li>
          </ul>
        </div>
        <p style="margin-top: 20px;">Have a safe journey!</p>
      </div>
    `
  });
};

const sendBookingReminderEnd = async (userEmail, bookingData) => {
  return await sendEmail({
    to: userEmail,
    subject: 'Booking Ending Soon - 10 Minutes Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Your Booking Ends in 10 Minutes</h2>
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
          <p><strong>Reminder:</strong> Please return the car soon!</p>
        </div>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Booking Details</h3>
          <p><strong>Car:</strong> ${bookingData.car?.make || 'N/A'} ${bookingData.car?.model || 'N/A'} (${bookingData.car?.year || 'N/A'})</p>
          <p><strong>License Number:</strong> ${bookingData.car?.licenseNumber || 'Not Available'}</p>
          <p><strong>End Time:</strong> ${bookingData.endTimeFormatted}</p>
          <p><strong>Booking ID:</strong> ${bookingData.id}</p>
        </div>
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
          <p style="margin: 0;"><strong>Important Reminders:</strong></p>
          <ul style="margin: 10px 0 0 0;">
            <li>Return the car to the designated location</li>
            <li>Ensure the car is in good condition</li>
            <li>Fill up fuel if required</li>
            <li>Lock the car and return keys as instructed</li>
          </ul>
        </div>
        <p style="margin-top: 20px;">Thank you for using our service!</p>
      </div>
    `
  });
};

module.exports = {
  testConnection,
  sendEmail,
  sendWelcomeEmail,
  sendEmailVerification,
  sendBookingConfirmation,
  sendCancellationEmail,
  sendBusinessBookingConfirmation,
  sendPrivateBookingConfirmation,
  sendPaymentConfirmation,
  sendPaymentFailedEmail,
  sendRefundConfirmation,
  generateInvoice,
  sendBookingReminderStart,
  sendBookingReminderEnd
};