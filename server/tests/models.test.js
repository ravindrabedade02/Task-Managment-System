import { test } from 'node:test';
import assert from 'node:assert/strict';
import Employee from '../src/models/Employee.js';
import Task, { PRIORITY_RANK } from '../src/models/Task.js';

const employee = (over = {}) => new Employee({
  employeeId: ' emp-001 ', fullName: 'Asha Rao', email: ' ASHA@Example.COM ', phone: '+91 98765 43210',
  department: 'Development', role: 'Developer', joiningDate: '2026-01-05', ...over
});

const task = (over = {}) => new Task({
  title: 'Build login page', department: 'Development', priority: 'High',
  startDate: '2026-11-20', dueDate: '2026-11-25', employeeSnapshot: { fullName: 'Asha Rao' }, ...over
});

test('employee: email and employee ID are normalised', async () => {
  const e = employee();
  await e.validate();
  assert.equal(e.email, 'asha@example.com');
  assert.equal(e.employeeId, 'EMP-001');
});

test('employee: On Leave needs both dates (400, not 500)', async () => {
  await assert.rejects(employee({ status: 'On Leave' }).validate(), (err) => err.statusCode === 400 && /Leave Start and Leave End/.test(err.message));
});

test('employee: leave end before leave start is rejected with 400', async () => {
  await assert.rejects(
    employee({ status: 'On Leave', leaveStart: '2026-12-10', leaveEnd: '2026-12-01' }).validate(),
    (err) => err.statusCode === 400 && /cannot be earlier/.test(err.message)
  );
});

test('employee: leave dates are cleared when the employee is not On Leave', async () => {
  const e = employee({ status: 'Active', leaveStart: '2026-12-01', leaveEnd: '2026-12-05' });
  await e.validate();
  assert.equal(e.leaveStart, undefined);
  assert.equal(e.leaveEnd, undefined);
});

test('employee: department must be one of the allowed values', async () => {
  await assert.rejects(employee({ department: 'Legal' }).validate(), /Legal|department/i);
});

test('task: due date before start date is rejected with 400', async () => {
  await assert.rejects(task({ dueDate: '2026-11-10' }).validate(), (err) => err.statusCode === 400 && /Due Date cannot be earlier/.test(err.message));
});

test('task: priorityRank follows the priority', async () => {
  for (const [priority, rank] of Object.entries(PRIORITY_RANK)) {
    const t = task({ priority });
    await t.validate();
    assert.equal(t.priorityRank, rank);
  }
  assert.ok(PRIORITY_RANK.Critical > PRIORITY_RANK.High && PRIORITY_RANK.High > PRIORITY_RANK.Medium && PRIORITY_RANK.Medium > PRIORITY_RANK.Low);
});

test('task: defaults to Todo, rejects bad priority and short titles', async () => {
  const t = task();
  await t.validate();
  assert.equal(t.status, 'Todo');
  await assert.rejects(task({ priority: 'Urgent' }).validate(), /priority/i);
  await assert.rejects(task({ title: 'ab' }).validate(), /title/i);
});
