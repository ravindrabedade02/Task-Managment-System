import dns from 'node:dns';
import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Task, { PRIORITY_RANK } from '../models/Task.js';

mongoose.set('strictQuery', true);

const DEFAULT_DB_NAME = 'roots_employee_tasks';

/** MONGO_URI is the documented name; MONGODB_URI (the name Atlas examples use) also works. */
export function getMongoUri(env = process.env) {
  return (env.MONGO_URI || env.MONGODB_URI || '').trim();
}

/** Turns a raw driver error into advice a person can act on. */
export function connectionHint(err) {
  const text = `${err?.name || ''} ${err?.message || ''}`;
  if (/bad auth|authentication failed/i.test(text)) {
    return 'The username or password was rejected. Check the database user in Atlas > Database Access, and URL-encode special characters in the password (for example @ becomes %40).';
  }
  if (/querySrv|ENOTFOUND|EAI_AGAIN/i.test(text)) {
    return 'The Atlas address could not be looked up (DNS). Check your internet connection, then try adding DNS_SERVERS=8.8.8.8,1.1.1.1 to server/.env, or use the non-SRV connection string from Atlas.';
  }
  if (/ServerSelection|timed out|ReplicaSetNoPrimary|ECONNREFUSED|ETIMEDOUT/i.test(text)) {
    return 'Atlas could not be reached. In Atlas > Network Access add your current IP address (or 0.0.0.0/0 for testing), and make sure the cluster is not paused.';
  }
  return '';
}

function useCustomDnsIfRequested() {
  const servers = (process.env.DNS_SERVERS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!servers.length) return;
  try {
    dns.setServers(servers);
  } catch (err) {
    console.warn(`DNS_SERVERS ignored: ${err.message}`);
  }
}

// Tasks saved before priorityRank existed would sort wrongly; fill the value in once. Safe to repeat.
async function backfillPriorityRank() {
  try {
    await Promise.all(Object.entries(PRIORITY_RANK).map(([priority, rank]) =>
      Task.updateMany({ priority, priorityRank: { $exists: false } }, { $set: { priorityRank: rank } }, { timestamps: false })
    ));
  } catch (err) {
    console.warn(`Could not backfill priorityRank: ${err.message}`);
  }
}

// Creating or editing a task uses a transaction, which only works on a replica set (Atlas always is one).
async function warnIfTransactionsUnavailable() {
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!info.setName && info.msg !== 'isdbgrid') {
      console.warn('WARNING: this MongoDB is a standalone server, so creating and editing tasks will fail. Use MongoDB Atlas or a local replica set.');
    }
  } catch {
    // Not important enough to stop startup.
  }
}

export async function connectDB() {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error('MONGO_URI is missing. Copy server/.env.example to server/.env and paste your MongoDB Atlas connection string into it.');
  }
  if (/<[^>]*>/.test(uri)) {
    throw new Error('MONGO_URI still contains a placeholder such as <db_password>. Replace the whole <...> part (brackets included) with your real database user password.');
  }

  useCustomDnsIfRequested();

  // Use the database named in the URI. If the URI has none, fall back to MONGO_DB_NAME or a sensible default.
  const uriHasDbName = /^mongodb(\+srv)?:\/\/[^/?]+\/[^/?]+/.test(uri);
  const options = { serverSelectionTimeoutMS: 10000 };
  if (!uriHasDbName) options.dbName = process.env.MONGO_DB_NAME || DEFAULT_DB_NAME;

  try {
    await mongoose.connect(uri, options);
  } catch (err) {
    const hint = connectionHint(err);
    if (hint) err.message = `${err.message}\n  -> ${hint}`;
    throw err;
  }

  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected: ${host} / database "${name}"`);

  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected. The driver will try to reconnect.'));
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected.'));

  // Create collections and unique indexes (employee ID, email, task ID) before serving requests.
  await Promise.all([Employee.init(), Task.init()]).catch((err) => console.warn(`Index setup warning: ${err.message}`));
  await backfillPriorityRank();
  await warnIfTransactionsUnavailable();
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
