import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/errors.js';
import { str, escapeRegex, pick, parsePaging, sortDirection } from '../utils/query.js';

const CREATE_FIELDS = ['employeeId', 'fullName', 'email', 'phone', 'department', 'role', 'joiningDate', 'status', 'skills', 'leaveStart', 'leaveEnd'];
// Employee ID is fixed once created (the edit form locks it, and task snapshots refer to it).
const UPDATE_FIELDS = CREATE_FIELDS.filter((f) => f !== 'employeeId');
const SORT_FIELDS = ['createdAt', 'fullName', 'joiningDate', 'employeeId'];

export const listEmployees = asyncHandler(async (req, res) => {
  const search = str(req.query.search);
  const department = str(req.query.department);
  const status = str(req.query.status);
  const filter = {};
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ fullName: regex }, { employeeId: regex }, { email: regex }];
  }
  if (department) filter.department = department;
  if (status) filter.status = status;

  const sortBy = SORT_FIELDS.includes(str(req.query.sortBy)) ? str(req.query.sortBy) : 'createdAt';
  const direction = sortDirection(req.query.order);
  const sort = { [sortBy]: direction, _id: direction };
  const { page, limit } = parsePaging(req.query);

  const [items, total] = await Promise.all([
    Employee.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Employee.countDocuments(filter)
  ]);
  res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError('Employee not found.', 404);
  res.json(employee);
});

export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.create(pick(req.body, CREATE_FIELDS));
  res.status(201).json(employee);
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError('Employee not found.', 404);
  Object.assign(employee, pick(req.body, UPDATE_FIELDS));
  await employee.save();
  res.json(employee);
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError('Employee not found.', 404);
  const active = await Task.exists({ assignedEmployee: employee._id, status: { $in: ['Todo', 'In Progress'] } });
  if (active) throw new AppError('Cannot delete this employee while Todo or In Progress tasks are assigned.', 400);
  await Task.updateMany({ assignedEmployee: employee._id }, { $set: { assignedEmployee: null } });
  await employee.deleteOne();
  res.json({ message: 'Employee deleted. Historical task snapshots have been preserved.' });
});
