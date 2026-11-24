const HEADERS = [
  'Task ID', 'Title', 'Employee', 'Department', 'Priority', 'Status',
  'Start Date', 'Due Date', 'Overdue', 'Created Date', 'Completed Date'
];

const validDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** 2026-11-24 */
export const dayText = (value) => {
  const d = validDate(value);
  return d ? d.toISOString().slice(0, 10) : '';
};

/** 2026-11-24 09:30:00 (UTC) */
export const timeText = (value) => {
  const d = validDate(value);
  return d ? d.toISOString().slice(0, 19).replace('T', ' ') : '';
};

/**
 * Quote one CSV cell. Text starting with = + - @ (or tab / CR) is prefixed with an apostrophe so
 * Excel and Google Sheets show it as text instead of running it as a formula (CSV injection).
 */
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Builds the full CSV text (with a UTF-8 BOM so Excel reads non-English names correctly). */
export function buildTasksCsv(tasks, overdueFn) {
  const rows = tasks.map((t) => [
    t.taskId,
    t.title,
    t.employeeSnapshot?.fullName,
    t.department,
    t.priority,
    t.status,
    dayText(t.startDate),
    dayText(t.dueDate),
    overdueFn(t) ? 'Yes' : 'No',
    timeText(t.createdAt),
    timeText(t.completedDate)
  ]);
  return '﻿' + [HEADERS, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
