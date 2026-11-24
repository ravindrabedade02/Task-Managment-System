const FIELD_LABELS = { employeeId: 'Employee ID', email: 'Email', taskId: 'Task ID' };

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Duplicate unique value (employee ID, email, task ID)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ message: `${FIELD_LABELS[field] || field} already exists.` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(' ') });
  }
  if (err.name === 'CastError') {
    const message = err.path === '_id' ? 'Invalid record ID.' : `Invalid value for ${err.path}.`;
    return res.status(400).json({ message });
  }
  // Malformed JSON in the request body
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body is not valid JSON.' });

  // Atlas could not be reached while handling a request
  if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
    console.error(err);
    return res.status(503).json({ message: 'Cannot reach the database. Check your MongoDB Atlas network access and that the cluster is running.' });
  }
  // Task create/update uses a transaction, which needs a replica set (Atlas has one, a plain local mongod does not)
  if (/Transaction numbers are only allowed/i.test(err.message || '')) {
    console.error(err);
    return res.status(500).json({ message: 'This database does not support transactions. Use MongoDB Atlas (or a local replica set).' });
  }

  const status = err.statusCode || err.status || 500;
  if (status >= 500) console.error(err);
  const message = status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message || 'Internal server error.';
  res.status(status).json({ message });
}
