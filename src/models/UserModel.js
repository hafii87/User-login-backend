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
      trim: true 
    },
    isEmailVerified: { 
      type: Boolean, 
      default: false 
    },
    isPhoneVerified: { 
      type: Boolean, 
      default: false 
    },
    licenseNumber: { 
      type: String, 
      trim: true 
    },
    isLicenseVerified: { 
      type: Boolean, 
      default: false 
    },
    dateOfBirth: { 
      type: Date 
    },
    isBackgroundChecked: { 
      type: Boolean, 
      default: false 
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
