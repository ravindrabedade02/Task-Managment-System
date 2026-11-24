import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Employee from '../src/models/Employee.js';
import Task from '../src/models/Task.js';
import { createTask, changeTaskStatus, updateTask } from '../src/services/taskService.js';

// These tests replace the database calls with fakes, so they check the business rules only.
// (Transactions and real queries are exercised when you run the app against MongoDB Atlas.)

const EMP_ID = '507f1f77bcf86cd799439011';
let emp, activeCount, calls;

beforeEach(() => {
  emp = { _id: EMP_ID, employeeId: 'EMP-001', fullName: 'Asha Rao', department: 'Development', status: 'Active' };
  activeCount = 0;
  calls = { inc: [], count: [], created: [] };

  mongoose.startSession = async () => ({ withTransaction: async (fn) => fn(), endSession: async () => {} });
  Employee.findOneAndUpdate = async (filter, update, options) => { calls.inc.push({ filter, update, session: options.session }); return emp; };
  Task.countDocuments = (query) => { calls.count.push(query); return { session: async () => activeCount }; };
  Task.create = async (docs) => { calls.created.push(docs[0]); return docs; };
});

const input = (over = {}) => ({
  title: 'Prepare report', assignedEmployee: EMP_ID, department: 'Development', priority: 'High',
  startDate: '2026-12-05', dueDate: '2026-12-10', ...over
});

test('creates a Todo task with an employee snapshot and a TSK- id', async () => {
  const t = await createTask(input());
  assert.equal(t.status, 'Todo');
  assert.match(t.taskId, /^TSK-/);
  assert.deepEqual(t.employeeSnapshot, { employeeId: 'EMP-001', fullName: 'Asha Rao', department: 'Development' });
});

test('locks the employee document inside the transaction before counting', async () => {
  await createTask(input());
  assert.equal(calls.inc.length, 1);
  assert.deepEqual(calls.inc[0].update, { $inc: { assignmentVersion: 1 } });
  assert.ok(calls.inc[0].session, 'update must run inside the session');
});

test('counts only Todo and In Progress tasks as active', async () => {
  await createTask(input());
  assert.deepEqual(calls.count[0].status, { $in: ['Todo', 'In Progress'] });
});

test('allows the 3rd active task but blocks the 4th', async () => {
  activeCount = 2;
  await createTask(input());
  activeCount = 3;
  await assert.rejects(createTask(input()), (err) => err.statusCode === 400 && /3 active tasks/.test(err.message));
});

test('inactive employees cannot be assigned', async () => {
  emp.status = 'Inactive';
  await assert.rejects(createTask(input()), /Inactive employees/);
});

test('on-leave: blocked when the start date is inside the leave period (inclusive), allowed outside', async () => {
  emp.status = 'On Leave';
  emp.leaveStart = new Date('2026-12-01');
  emp.leaveEnd = new Date('2026-12-10');
  for (const startDate of ['2026-12-01', '2026-12-05', '2026-12-10']) {
    await assert.rejects(createTask(input({ startDate })), /on leave/, startDate);
  }
  for (const startDate of ['2026-11-30', '2026-12-11']) {
    await createTask(input({ startDate, dueDate: '2026-12-31' }));
  }
});

test('rejects a missing, malformed or unknown employee', async () => {
  await assert.rejects(createTask(input({ assignedEmployee: undefined })), /not found/);
  await assert.rejects(createTask(input({ assignedEmployee: { $ne: null } })), /not found/);
  await assert.rejects(createTask(input({ assignedEmployee: 'abc' })), /not found/);
  Employee.findOneAndUpdate = async () => null;
  await assert.rejects(createTask(input()), /not found/);
});

test('status flow: Todo > In Progress > Completed sets the completion date on the server', async () => {
  const doc = { status: 'Todo', completedDate: null, save: async function () { return this; } };
  await changeTaskStatus(doc, 'In Progress');
  assert.equal(doc.status, 'In Progress');
  assert.equal(doc.completedDate, null);
  await changeTaskStatus(doc, 'Completed');
  assert.equal(doc.status, 'Completed');
  assert.ok(doc.completedDate instanceof Date);
});

test('status flow rejects skipping steps and leaving a final state', async () => {
  const save = async function () { return this; };
  await assert.rejects(changeTaskStatus({ status: 'Todo', save }, 'Completed'), /Invalid status change/);
  await assert.rejects(changeTaskStatus({ status: 'Completed', save }, 'Todo'), /Invalid status change/);
  await assert.rejects(changeTaskStatus({ status: 'Cancelled', save }, 'In Progress'), /none/);
  await assert.rejects(changeTaskStatus({ status: 'Todo', save }, { $ne: 1 }), /Invalid status change/);
});

test('completed and cancelled tasks cannot be edited', async () => {
  await assert.rejects(updateTask({ status: 'Completed' }, {}), /cannot be edited/);
  await assert.rejects(updateTask({ status: 'Cancelled' }, {}), /cannot be edited/);
});

test('editing a task does not count the task itself towards the 3-task limit', async () => {
  activeCount = 2;
  const doc = {
    _id: 'task-1', status: 'In Progress', assignedEmployee: EMP_ID, startDate: new Date('2026-12-05'),
    save: async function () { return this; }
  };
  const updated = await updateTask(doc, { title: 'New title' });
  assert.equal(updated.title, 'New title');
  assert.deepEqual(calls.count[0]._id, { $ne: 'task-1' });
});
