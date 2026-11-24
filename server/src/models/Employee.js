import mongoose from 'mongoose';
import { AppError } from '../utils/errors.js';

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  department: { type: String, required: true, enum: ['Development','Design','QA','HR','Sales'] },
  role: { type: String, required: true, trim: true },
  joiningDate: { type: Date, required: true },
  status: { type: String, enum: ['Active','Inactive','On Leave'], default: 'Active' },
  skills: [{ type: String, trim: true }],
  leaveStart: Date,
  leaveEnd: Date,
  // Bumped inside the task-assignment transaction. Two requests assigning to the same employee at the
  // same moment both write this field, so MongoDB makes one retry and the 3-active-task limit holds.
  assignmentVersion: { type: Number, default: 0, select: false }
}, { timestamps: true });

employeeSchema.pre('validate', function(next) {
  this.email = this.email?.trim().toLowerCase();
  this.employeeId = this.employeeId?.trim().toUpperCase();
  if (this.status === 'On Leave') {
    if (!this.leaveStart || !this.leaveEnd) return next(new AppError('Leave Start and Leave End are required for employees On Leave.', 400));
    if (new Date(this.leaveEnd) < new Date(this.leaveStart)) return next(new AppError('Leave End cannot be earlier than Leave Start.', 400));
  } else {
    this.leaveStart = undefined;
    this.leaveEnd = undefined;
  }
  next();
});

export default mongoose.model('Employee', employeeSchema);
