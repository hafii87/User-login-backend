const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    timezone: { 
      type: String, 
      default: 'Asia/Karachi' 
    },
    role: { 
      type: String, 
      enum: ['user', 'admin'], 
      default: 'user',
      index: true
    },
    phone: { 
      type: String, 
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: function(v) {
          return /^\+92\d{10}$/.test(v); 
        },
        message: 'Phone number must be in format +92xxxxxxxxxx'
      }
    },
    isEmailVerified: { 
      type: Boolean, 
      default: false
    },
    emailVerificationToken: {
      type: String
    },
    emailVerifiedAt: {
      type: Date
    },
    drivingLicenseNumber: { 
      type: String, 
      required: [true, 'Driving license number is required'],
      trim: true,
      unique: true,
      validate: {
        validator: function(v) {
          return /^[A-Z0-9]{8,15}$/.test(v);
        },
        message: 'Invalid driving license format'
      }
    },
    stripeCustomerId: {
     type: String,
     default: null
    },
    stripeSubscriptionId: {
      type: String,
      default: null
    },
    isLicenseVerified: { 
      type: Boolean, 
      default: false 
    },
    licenseVerifiedAt: {
      type: Date
    },
    dateOfBirth: { 
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: function(v) {
          const age = Math.floor((Date.now() - v) / (365.25 * 24 * 60 * 60 * 1000));
          return age >= 18;
        },
        message: 'Must be at least 18 years old to register'
      }
    },
    isBackgroundChecked: { 
      type: Boolean, 
      default: false 
    },
    accountStatus: {
      type: String,
      enum: ['pending', 'verified', 'suspended', 'blocked'],
      default: 'pending'
    },
    groupMemberships: [
      {
        group: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Group'
        },
        role: {
          type: String,
          enum: ['admin', 'member'],
          default: 'member'
        },
        status: {
          type: String,
          enum: ['active', 'pending', 'suspended'],
          default: 'pending'
        }
      }
    ]
  },
  { timestamps: true }
);

userSchema.pre('save', function(next) {
  if (this.isEmailVerified) {
    this.accountStatus = 'verified';
  } else {
    this.accountStatus = 'pending';
  }
  next();
});

userSchema.virtual('cars', {
  ref: 'Car',
  localField: '_id',
  foreignField: 'owner'
});

userSchema.set('toJSON', { 
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;  
    delete ret._id;    
    delete ret.__v;
    delete ret.password;
    delete ret.emailVerificationToken;
    return ret;
  }
});

userSchema.virtual('groups', {
  ref: 'Group',
  localField: '_id',
  foreignField: 'members.user',
  match: { 'members.status': 'active' }
});

userSchema.set('toObject', { virtuals: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
