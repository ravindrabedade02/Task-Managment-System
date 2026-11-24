// Small helpers for turning untrusted query-string / body values into safe values.

/** Only plain strings are accepted. Arrays and objects (e.g. ?status[$ne]=x) become ''. */
export const str = (value) => (typeof value === 'string' ? value.trim() : '');

/** Escape user text so it can be used inside a RegExp without changing its meaning. */
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Copy only the listed keys from an object (blocks mass assignment of fields like _id or taskId). */
export function pick(source, keys) {
  const out = {};
  if (!source || typeof source !== 'object') return out;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key];
  }
  return out;
}

/** page >= 1, 1 <= limit <= 100. Garbage such as ?page=abc falls back to the defaults. */
export function parsePaging(query, defaultLimit = 10) {
  const page = Math.max(1, parseInt(str(query.page), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(str(query.limit), 10) || defaultLimit));
  return { page, limit };
}

/** Parses "YYYY-MM-DD" (optionally with a time) into a Date, or null when invalid. */
export function parseDay(value) {
  const s = str(value);
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const sortDirection = (order) => (str(order) === 'asc' ? 1 : -1);
