import mongoose from 'mongoose';
import { AppError } from '../utils/errors.js';

// Used for sorting by priority (the words themselves do not sort in order of importance).
export const PRIORITY_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };

const taskSchema = new mongoose.Schema({
  taskId: { type: String, unique: true },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  employeeSnapshot: {
    employeeId: { type: String, default: '' },
    fullName: { type: String, required: true },
    department: { type: String, default: '' }
  },
  department: { type: String, required: true, enum: ['Development','Design','QA','HR','Sales'] },
  priority: { type: String, required: true, enum: ['Low','Medium','High','Critical'] },
  priorityRank: { type: Number, select: false },
  status: { type: String, enum: ['Todo','In Progress','Completed','Cancelled'], default: 'Todo' },
  startDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  completedDate: { type: Date, default: null }
}, { timestamps: true });

// Used by the active-task count, the delete-employee check and the overdue count.
taskSchema.index({ assignedEmployee: 1, status: 1 });
taskSchema.index({ status: 1, dueDate: 1 });

taskSchema.pre('validate', function(next) {
  if (this.dueDate && this.startDate && new Date(this.dueDate) < new Date(this.startDate))
    return next(new AppError('Due Date cannot be earlier than Start Date.', 400));
  if (Object.prototype.hasOwnProperty.call(PRIORITY_RANK, this.priority)) this.priorityRank = PRIORITY_RANK[this.priority];
  next();
});

export default mongoose.model('Task', taskSchema);
