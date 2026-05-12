const mongoose = require('mongoose');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const studentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'firstName is required'],
      trim: true,
      minlength: [2, 'firstName must be at least 2 characters'],
      maxlength: [50, 'firstName must be at most 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'lastName is required'],
      trim: true,
      minlength: [2, 'lastName must be at least 2 characters'],
      maxlength: [50, 'lastName must be at most 50 characters']
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, 'email must be a valid email address']
    },
    age: {
      type: Number,
      min: [0, 'age must be at least 0'],
      max: [150, 'age must be at most 150']
    },
    course: {
      type: String,
      trim: true,
      maxlength: [100, 'course must be at most 100 characters']
    },
    dateRegistered: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

studentSchema.index({ firstName: 1, lastName: 1 });

module.exports = mongoose.model('Student', studentSchema);
