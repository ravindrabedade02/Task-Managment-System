import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Loads server/.env no matter which folder the start command is run from.
// Import this file before anything that reads process.env.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
