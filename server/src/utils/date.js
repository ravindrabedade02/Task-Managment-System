// Dates in this app are calendar days. They arrive from <input type="date"> as "YYYY-MM-DD",
// which JavaScript stores as UTC midnight. So every day comparison uses the UTC parts of the stored
// value, and "today" is the server's local calendar date expressed as UTC midnight. This keeps
// overdue and leave checks correct no matter which time zone the server runs in.

/** Calendar day of a stored date as a UTC-midnight timestamp, or null if the value is not a date. */
export function utcDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** The server's current local calendar date as a UTC-midnight timestamp. */
export function todayUtc(now = new Date()) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** A task is overdue when today is later than its due date and it is neither Completed nor Cancelled. */
export function isOverdue(task, now = new Date()) {
  if (['Completed', 'Cancelled'].includes(task.status)) return false;
  const due = utcDay(task.dueDate);
  return due !== null && todayUtc(now) > due;
}
