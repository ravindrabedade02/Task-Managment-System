import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import { AppError } from '../utils/errors.js';
import { utcDay } from '../utils/date.js';

export const activeStatuses = ['Todo', 'In Progress'];
const MAX_ACTIVE_TASKS = 3;
const transitions = {
  'Todo': ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  'Completed': [],
  'Cancelled': []
};

async function validateAssignment(employeeId, startDate, excludeTaskId, session) {
  if (!employeeId || !mongoose.isValidObjectId(employeeId)) throw new AppError('Selected employee was not found.', 400);

  // Writing to the employee document first makes concurrent assignments to the same employee conflict:
  // MongoDB aborts one transaction, withTransaction() retries it, and the retry sees the other task
  // when it counts below. Without this, two simultaneous requests could both pass the 3-task check.
  const employee = await Employee.findOneAndUpdate(
    { _id: employeeId },
    { $inc: { assignmentVersion: 1 } },
    { new: true, session }
  );
  if (!employee) throw new AppError('Selected employee was not found.', 400);
  if (employee.status === 'Inactive') throw new AppError('Inactive employees cannot be assigned tasks.', 400);

  if (employee.status === 'On Leave') {
    const taskStart = utcDay(startDate);
    const leaveFrom = utcDay(employee.leaveStart);
    const leaveTo = utcDay(employee.leaveEnd);
    if (taskStart !== null && leaveFrom !== null && leaveTo !== null && taskStart >= leaveFrom && taskStart <= leaveTo)
      throw new AppError('This employee is on leave during the task start date. Choose another employee.', 400);
  }

  const query = { assignedEmployee: employee._id, status: { $in: activeStatuses } };
  if (excludeTaskId) query._id = { $ne: excludeTaskId };
  const count = await Task.countDocuments(query).session(session);
  if (count >= MAX_ACTIVE_TASKS) throw new AppError('Employee already has 3 active tasks. Please choose another employee.', 400);
  return employee;
}

function makeTaskId() {
  return `TSK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createTask(data) {
  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const employee = await validateAssignment(data.assignedEmployee, data.startDate, null, session);
      const [task] = await Task.create([{
        ...data,
        taskId: makeTaskId(),
        status: 'Todo',
        employeeSnapshot: { employeeId: employee.employeeId, fullName: employee.fullName, department: employee.department },
        department: data.department || employee.department
      }], { session });
      created = task;
    });
  } finally {
    await session.endSession();
  }
  return created;
}

export async function updateTask(task, data) {
  if (['Completed', 'Cancelled'].includes(task.status)) throw new AppError('Completed and Cancelled tasks cannot be edited.', 400);
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const employee = await validateAssignment(
        data.assignedEmployee || task.assignedEmployee,
        data.startDate || task.startDate,
        task._id,
        session
      );
      Object.assign(task, data);
      task.employeeSnapshot = { employeeId: employee.employeeId, fullName: employee.fullName, department: employee.department };
      task.department = data.department || employee.department;
      updated = await task.save({ session });
    });
  } finally {
    await session.endSession();
  }
  return updated;
}

export async function changeTaskStatus(task, nextStatus) {
  if (!transitions[task.status]?.includes(nextStatus))
    throw new AppError(`Invalid status change. Allowed next status: ${transitions[task.status]?.join(', ') || 'none'}.`, 400);
  task.status = nextStatus;
  if (nextStatus === 'Completed') task.completedDate = new Date();
  return task.save();
}
