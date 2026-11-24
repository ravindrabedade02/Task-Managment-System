import { str, parseDay, sortDirection } from './query.js';

// Public sort name -> database field. "priority" sorts by priorityRank (Low=1 ... Critical=4),
// because sorting the words themselves would give Medium, Low, High, Critical.
const SORT_FIELDS = { createdAt: 'createdAt', dueDate: 'dueDate', priority: 'priorityRank', title: 'title' };

/** Exact-match filters and the due-date range. Search is added separately because it needs a lookup. */
export function buildTaskFilter(q) {
  const filter = {};
  const department = str(q.department);
  const priority = str(q.priority);
  const status = str(q.status);
  if (department) filter.department = department;
  if (priority) filter.priority = priority;
  if (status) filter.status = status;

  const from = parseDay(q.dueFrom);
  const to = parseDay(q.dueTo);
  if (from || to) {
    filter.dueDate = {};
    if (from) filter.dueDate.$gte = from;
    if (to) filter.dueDate.$lte = to;
  }
  return filter;
}

/** Sort object with _id as a tie-breaker so pages never repeat or skip rows when values are equal. */
export function buildTaskSort(q) {
  const requested = str(q.sortBy);
  const field = Object.prototype.hasOwnProperty.call(SORT_FIELDS, requested) ? SORT_FIELDS[requested] : 'createdAt';
  const direction = sortDirection(q.order);
  return { [field]: direction, _id: direction };
}
