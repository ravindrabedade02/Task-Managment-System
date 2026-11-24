import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { todayUtc } from '../utils/date.js';
import { activeStatuses } from '../services/taskService.js';

export const getDashboard = asyncHandler(async (req, res) => {
  // Same rule as isOverdue(): not Completed/Cancelled and due before today. Counted by the database
  // instead of loading every task into memory.
  const overdueFilter = { status: { $in: activeStatuses }, dueDate: { $lt: new Date(todayUtc()) } };

  const [totalEmployees, activeEmployees, inactiveEmployees, onLeaveEmployees, totalTasks, taskGroups, workload, overdueTasks] = await Promise.all([
    Employee.countDocuments(),
    Employee.countDocuments({ status: 'Active' }),
    Employee.countDocuments({ status: 'Inactive' }),
    Employee.countDocuments({ status: 'On Leave' }),
    Task.countDocuments(),
    Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.aggregate([
      { $match: { status: { $in: activeStatuses }, assignedEmployee: { $ne: null } } },
      { $group: { _id: '$assignedEmployee', activeTasks: { $sum: 1 } } },
      { $sort: { activeTasks: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' } },
      { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, employee: { $ifNull: ['$employee.fullName', 'Deleted employee'] }, activeTasks: 1 } }
    ]),
    Task.countDocuments(overdueFilter)
  ]);

  const counts = Object.fromEntries(taskGroups.map((x) => [x._id, x.count]));
  res.json({
    employees: { total: totalEmployees, active: activeEmployees, inactive: inactiveEmployees, onLeave: onLeaveEmployees },
    tasks: {
      total: totalTasks,
      todo: counts['Todo'] || 0,
      inProgress: counts['In Progress'] || 0,
      completed: counts['Completed'] || 0,
      cancelled: counts['Cancelled'] || 0,
      overdue: overdueTasks
    },
    workload
  });
});
