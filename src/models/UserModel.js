const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

userSchema.virtual('cars', {
  ref: 'Car',
  localField: '_id',
  foreignField: 'owner'
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });


const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
