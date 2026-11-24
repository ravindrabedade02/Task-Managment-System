import { test } from 'node:test';
import assert from 'node:assert/strict';
import { utcDay, todayUtc, isOverdue } from '../src/utils/date.js';
import { str, escapeRegex, pick, parsePaging, parseDay } from '../src/utils/query.js';
import { buildTaskFilter, buildTaskSort } from '../src/utils/taskQuery.js';
import { csvCell, buildTasksCsv } from '../src/utils/csv.js';
import { getMongoUri, connectionHint, connectDB } from '../src/config/db.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { AppError } from '../src/utils/errors.js';

// ---------- dates ----------
test('overdue: due yesterday is overdue, due today is not, completed/cancelled never are', () => {
  const now = new Date(2026, 10, 24, 12, 0); // 24 Nov 2026, local noon
  assert.equal(isOverdue({ status: 'Todo', dueDate: new Date('2026-11-23') }, now), true);
  assert.equal(isOverdue({ status: 'Todo', dueDate: new Date('2026-11-24') }, now), false);
  assert.equal(isOverdue({ status: 'In Progress', dueDate: new Date('2026-11-25') }, now), false);
  assert.equal(isOverdue({ status: 'Completed', dueDate: new Date('2026-01-01') }, now), false);
  assert.equal(isOverdue({ status: 'Cancelled', dueDate: new Date('2026-01-01') }, now), false);
  assert.equal(isOverdue({ status: 'Todo', dueDate: 'not a date' }, now), false);
});

test('utcDay / todayUtc return UTC-midnight timestamps', () => {
  assert.equal(utcDay('2026-11-24'), Date.UTC(2026, 10, 24));
  assert.equal(utcDay('garbage'), null);
  assert.equal(todayUtc(new Date(2026, 10, 24, 23, 59)), Date.UTC(2026, 10, 24));
});

// ---------- query helpers ----------
test('str only accepts plain strings (blocks ?status[$ne]=x style injection)', () => {
  assert.equal(str('  Todo '), 'Todo');
  assert.equal(str({ $ne: 'x' }), '');
  assert.equal(str(['a', 'b']), '');
  assert.equal(str(undefined), '');
});

test('escapeRegex makes special characters safe', () => {
  for (const text of ['(', '[abc', 'a+b*', 'C++ (dev)', '.*', '\\']) {
    assert.doesNotThrow(() => new RegExp(escapeRegex(text), 'i'), text);
  }
  assert.ok(new RegExp(escapeRegex('a.b'), 'i').test('a.b'));
  assert.ok(!new RegExp(escapeRegex('a.b'), 'i').test('axb'));
});

test('pick keeps only allowed keys', () => {
  const out = pick({ title: 't', _id: 'x', taskId: 'y', completedDate: 'z' }, ['title', 'description']);
  assert.deepEqual(out, { title: 't' });
  assert.deepEqual(pick(null, ['a']), {});
});

test('parsePaging survives garbage', () => {
  assert.deepEqual(parsePaging({ page: 'abc', limit: 'xyz' }), { page: 1, limit: 10 });
  assert.deepEqual(parsePaging({ page: '-4', limit: '5000' }), { page: 1, limit: 100 });
  assert.deepEqual(parsePaging({ page: '3', limit: '25' }), { page: 3, limit: 25 });
  assert.deepEqual(parsePaging({ page: ['1'], limit: { a: 1 } }), { page: 1, limit: 10 });
});

test('parseDay accepts YYYY-MM-DD only', () => {
  assert.ok(parseDay('2026-11-24') instanceof Date);
  assert.equal(parseDay('24/11/2026'), null);
  assert.equal(parseDay('2026-13-45'), null);
  assert.equal(parseDay({}), null);
});

// ---------- task filters and sorting ----------
test('buildTaskFilter ignores objects and invalid dates, keeps valid ones', () => {
  const f = buildTaskFilter({ status: { $ne: 'Todo' }, priority: 'High', department: 'QA', dueFrom: '2026-11-01', dueTo: 'nope' });
  assert.deepEqual(Object.keys(f).sort(), ['department', 'dueDate', 'priority']);
  assert.equal(f.priority, 'High');
  assert.ok(f.dueDate.$gte instanceof Date);
  assert.equal(f.dueDate.$lte, undefined);
});

test('priority sorts by rank (Critical first when descending), never alphabetically', () => {
  assert.deepEqual(buildTaskSort({ sortBy: 'priority', order: 'desc' }), { priorityRank: -1, _id: -1 });
  assert.deepEqual(buildTaskSort({ sortBy: 'priority', order: 'asc' }), { priorityRank: 1, _id: 1 });
});

test('buildTaskSort rejects unknown / prototype keys', () => {
  assert.deepEqual(buildTaskSort({ sortBy: 'constructor' }), { createdAt: -1, _id: -1 });
  assert.deepEqual(buildTaskSort({ sortBy: '__proto__' }), { createdAt: -1, _id: -1 });
  assert.deepEqual(buildTaskSort({ sortBy: 'dueDate', order: 'asc' }), { dueDate: 1, _id: 1 });
  assert.deepEqual(buildTaskSort({}), { createdAt: -1, _id: -1 });
});

// ---------- CSV ----------
test('csvCell quotes values and neutralises spreadsheet formulas', () => {
  assert.equal(csvCell('plain'), '"plain"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('=SUM(A1:A9)'), `"'=SUM(A1:A9)"`);
  assert.equal(csvCell('+1'), `"'+1"`);
  assert.equal(csvCell('@cmd'), `"'@cmd"`);
  assert.equal(csvCell(null), '""');
});

test('buildTasksCsv formats dates as ISO text and keeps one row per task', () => {
  const csv = buildTasksCsv([
    {
      taskId: 'TSK-1', title: '=HYPERLINK("x")', employeeSnapshot: { fullName: 'Asha Rao' }, department: 'QA',
      priority: 'High', status: 'Todo', startDate: new Date('2026-11-20'), dueDate: new Date('2026-11-23'),
      createdAt: new Date('2026-11-19T10:15:30Z'), completedDate: null
    }
  ], () => true);
  assert.ok(csv.startsWith('﻿"Task ID"'));
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[1].includes('"2026-11-20","2026-11-23","Yes","2026-11-19 10:15:30",""'));
  assert.ok(lines[1].includes(`"'=HYPERLINK(""x"")"`));
});

// ---------- Atlas connection helpers ----------
test('getMongoUri accepts MONGO_URI or MONGODB_URI', () => {
  assert.equal(getMongoUri({ MONGO_URI: ' a ' }), 'a');
  assert.equal(getMongoUri({ MONGODB_URI: 'b' }), 'b');
  assert.equal(getMongoUri({}), '');
});

test('connectionHint explains the usual Atlas failures', () => {
  assert.match(connectionHint(new Error('bad auth : Authentication failed.')), /Database Access/);
  assert.match(connectionHint(new Error('querySrv ECONNREFUSED _mongodb._tcp.x.mongodb.net')), /DNS_SERVERS/);
  const timeout = new Error('Server selection timed out after 10000 ms');
  timeout.name = 'MongooseServerSelectionError';
  assert.match(connectionHint(timeout), /Network Access/);
  assert.equal(connectionHint(new Error('something else')), '');
});

test('connectDB fails fast with clear messages (no network used)', async () => {
  const saved = { a: process.env.MONGO_URI, b: process.env.MONGODB_URI };
  try {
    delete process.env.MONGO_URI; delete process.env.MONGODB_URI;
    await assert.rejects(connectDB(), /MONGO_URI is missing/);
    process.env.MONGO_URI = 'mongodb+srv://user:<db_password>@cluster0.abc.mongodb.net/roots?retryWrites=true';
    await assert.rejects(connectDB(), /placeholder/);
  } finally {
    if (saved.a === undefined) delete process.env.MONGO_URI; else process.env.MONGO_URI = saved.a;
    if (saved.b === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = saved.b;
  }
});

// ---------- error handler ----------
function run(err) {
  const out = { status: null, body: null };
  const res = { headersSent: false, status(s) { out.status = s; return this; }, json(b) { out.body = b; return this; } };
  const quiet = console.error; console.error = () => {};
  try { errorHandler(err, {}, res, () => {}); } finally { console.error = quiet; }
  return out;
}

test('errorHandler maps common errors to the right HTTP status', () => {
  let r = run(Object.assign(new Error('dup'), { code: 11000, keyPattern: { employeeId: 1 } }));
  assert.deepEqual([r.status, r.body.message], [409, 'Employee ID already exists.']);
  r = run(Object.assign(new Error('dup'), { code: 11000, keyPattern: { email: 1 } }));
  assert.deepEqual([r.status, r.body.message], [409, 'Email already exists.']);
  r = run(new AppError('Nope.', 400));
  assert.deepEqual([r.status, r.body.message], [400, 'Nope.']);
  r = run(new AppError('Missing.', 404));
  assert.equal(r.status, 404);
  r = run(Object.assign(new Error('bad'), { name: 'CastError', path: '_id' }));
  assert.deepEqual([r.status, r.body.message], [400, 'Invalid record ID.']);
  r = run(Object.assign(new Error('bad'), { name: 'CastError', path: 'dueDate' }));
  assert.deepEqual([r.status, r.body.message], [400, 'Invalid value for dueDate.']);
  r = run(Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed', status: 400 }));
  assert.deepEqual([r.status, r.body.message], [400, 'Request body is not valid JSON.']);
  r = run(Object.assign(new Error('x'), { name: 'MongoServerSelectionError' }));
  assert.equal(r.status, 503);
  r = run(new Error('Transaction numbers are only allowed on a replica set member or mongos'));
  assert.match(r.body.message, /Atlas/);
});

test('errorHandler hides internal details of 500s in production only', () => {
  const saved = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.equal(run(new Error('secret internals')).body.message, 'Internal server error.');
    process.env.NODE_ENV = 'development';
    assert.equal(run(new Error('secret internals')).body.message, 'secret internals');
  } finally {
    if (saved === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = saved;
  }
});
