import './config/env.js'; // must stay first: loads server/.env before the other modules read process.env
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE'
      ? `Port ${PORT} is already in use. Stop the other process or change PORT in server/.env.`
      : `Server error: ${err.message}`);
    process.exit(1);
  });

  // Close the HTTP server and the database connection cleanly on Ctrl+C / deploy restarts.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB().catch(() => {});
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
