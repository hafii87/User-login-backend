const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    minlength: [2, 'Group name must be at least 2 characters'],
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Group creator is required']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'pending'
    }
  }],
  cars: [{
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car',
      required: true
    },
    allowPrivateBooking: {
      type: Boolean,
      default: false
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  preferences: {
    maxBookingDuration: {
      type: Number,
      default: 168,
      min: 1
    },
    advanceBookingLimit: {
      type: Number,
      default: 30,
      min: 1
    },
    autoApproveBookings: {
      type: Boolean,
      default: true
    },
    allowMemberInvites: {
      type: Boolean,
      default: false
    },
    bookingCancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict'],
      default: 'moderate'
    }
  },
  companyCommissionPercentage: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },
  groupOwnerCommissionPercentage: {
    type: Number,
    default: 15,
    min: 0,
    max: 100
  },
  pricePerHour: {
    type: Number,
    default: 10
  },
  rules: {
    emailVerified: {
      type: Boolean,
      default: false
    },
    phoneVerified: {
      type: Boolean,
      default: false
    },
    licenseRequired: {
      type: Boolean,
      default: false
    },
    minimumAge: {
      type: Number,
      min: 16,
      max: 100
    },
    backgroundCheckRequired: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  privacy: {
    type: String,
    enum: ['public', 'private', 'invite-only'],
    default: 'private'
  }
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
    }
  },
  toObject: { virtuals: true }
});

groupSchema.virtual('activeMembersCount').get(function() {
  return this.members.filter(member => member.status === 'active').length;
});

groupSchema.virtual('carsCount').get(function() {
  return this.cars.length;
});

groupSchema.index({ creator: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ name: 'text', description: 'text' });

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
module.exports = Group;