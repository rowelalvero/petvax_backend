// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userRoles = {
  ADMIN: 'admin',
  CLINIC_OWNER: 'clinic_owner',
  VETERINARIAN: 'veterinarian',
  SECRETARY: 'secretary',
  PET_OWNER: 'pet_owner'
};

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Invalid email format']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: true // Never return password in queries
  },
  phoneNumber: {
    type: String,
    validate: {
      validator: function(v) {
        return /^[0-9]{10,15}$/.test(v);
      },
      message: 'Invalid phone number'
    }
  },
  role: {
    type: String,
    required: true,
    enum: Object.values(userRoles),
    default: userRoles.PET_OWNER
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    default: null,
    required: function() {
      return this.role !== userRoles.ADMIN && this.role !== userRoles.PET_OWNER;
    }
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },
  position: {
    type: String,
    required: function() {
      return this.role !== 'pet_owner' && this.role !== 'admin';
    }
  },
  specialties: {
    type: [String],
    required: function() {
      return this.role === 'veterinarian';
    }
  },
  isActiveStaff: {
    type: Boolean,
    default: true
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  schedule: {
    workDays: [{
      type: Number, // 0-6 (Sunday-Saturday)
      required: true
    }],
    startTime: String, // "09:00"
    endTime: String   // "17:00"
  },
  profileImage: {
    type: String,
    validate: [validator.isURL, 'Invalid image URL format'],
    default: 'https://example.com/default-profile-image.png'
  },
  // Add to schema
  notificationPreferences: {
    appointmentReminders: {
      channel: {
        type: String,
        enum: ['email', 'none'], // Removed SMS options
        default: 'email'
      },
      advanceTime: {
        type: Number,
        enum: [1, 6, 12, 24],
        default: 24
      }
    },
    promotions: {
      type: Boolean,
      default: true
    },
    vaccinationReminders: {
      channel: {
        type: String,
        enum: ['email', 'none'], // Removed SMS options
        default: 'email'
      }
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
}, { timestamps: true });

// Password hashing before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to check password validity
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Method to check if password was changed after a given timestamp (for JWT)
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const User = mongoose.model('User', userSchema);

userSchema.index({ role: 1 });
userSchema.index({ clinicId: 1 });
userSchema.index({ joiningDate: -1 });
userSchema.index({ clinicId: 1, role: 1 }); // Compound index

module.exports = User;