import Task from '../models/Task.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/errors.js';
import { isOverdue } from '../utils/date.js';
import { str, escapeRegex, pick, parsePaging } from '../utils/query.js';
import { buildTaskFilter, buildTaskSort } from '../utils/taskQuery.js';
import { buildTasksCsv } from '../utils/csv.js';
import { createTask, updateTask, changeTaskStatus } from '../services/taskService.js';

// The only fields a client may set. Status and completedDate are managed by the server.
const TASK_FIELDS = ['title', 'description', 'assignedEmployee', 'department', 'priority', 'startDate', 'dueDate'];

async function searchFilter(q) {
  const filter = buildTaskFilter(q);
  const search = str(q.search);
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: 'i' };
    const employees = await Employee.find({ fullName: regex }).select('_id').lean();
    filter.$or = [
      { title: regex },
      { 'employeeSnapshot.fullName': regex },
      { assignedEmployee: { $in: employees.map((e) => e._id) } }
    ];
  }
  return filter;
}

function enrich(task) {
  const obj = task.toObject ? task.toObject() : task;
  obj.overdue = isOverdue(obj);
  return obj;
}

export const listTasks = asyncHandler(async (req, res) => {
  const filter = await searchFilter(req.query);
  const { page, limit } = parsePaging(req.query);
  const sort = buildTaskSort(req.query);
  const [items, total] = await Promise.all([
    Task.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate('assignedEmployee', 'fullName employeeId'),
    Task.countDocuments(filter)
  ]);
  res.json({ items: items.map(enrich), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('assignedEmployee', 'fullName employeeId department');
  if (!task) throw new AppError('Task not found.', 404);
  res.json(enrich(task));
});

export const createTaskController = asyncHandler(async (req, res) => {
  const task = await createTask(pick(req.body, TASK_FIELDS));
  res.status(201).json(enrich(task));
});

export const updateTaskController = asyncHandler(async (req, res) => {
  if ('status' in req.body || 'completedDate' in req.body) throw new AppError('Status and Completed Date cannot be changed through this endpoint.', 400);
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError('Task not found.', 404);
  const updated = await updateTask(task, pick(req.body, TASK_FIELDS));
  res.json(enrich(updated));
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError('Task not found.', 404);
  const updated = await changeTaskStatus(task, req.body.status);
  res.json(enrich(updated));
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError('Task not found.', 404);
  if (['Completed', 'Cancelled'].includes(task.status)) throw new AppError('Completed and Cancelled tasks cannot be deleted.', 400);
  await task.deleteOne();
  res.json({ message: 'Task deleted.' });
});

// Exports every task that matches the active filters (not just the current page).
export const exportTasks = asyncHandler(async (req, res) => {
  const filter = await searchFilter(req.query);
  const tasks = await Task.find(filter).sort(buildTaskSort(req.query)).lean();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tasks-export.csv"');
  res.send(buildTasksCsv(tasks, isOverdue));
});
