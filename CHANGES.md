# Changes in this version

## MongoDB Atlas
- `server/.env.example` is now an Atlas template (`mongodb+srv://...`). The old one pointed to a local MongoDB, which cannot run the transactions used for task assignment.
- Startup checks: missing `MONGO_URI`, leftover `<db_password>` placeholder, wrong password, IP not allowed and DNS errors each print a clear explanation.
- Indexes (unique employee ID / email / task ID) are created before the API starts accepting requests.
- Warns if the database is a standalone server (no transactions).
- `.env` is loaded from `server/.env` whatever folder the command is run from.
- `GET /api/health` also shows whether the database is connected.
- Clean shutdown on Ctrl+C; clear message if port 5000 is busy.

## Bug fixes
- **Priority sort** sorted alphabetically (Medium, Low, High, Critical). It now sorts by importance and respects ascending/descending.
- **Employee dropdown** in the task form listed only Active employees, so On Leave employees could never be assigned even when their leave did not overlap the task. It now lists everyone except Inactive and keeps the current assignee when editing.
- **Search** text was used as a raw regular expression, so input like `(` caused an error. It is now escaped.
- **Employee list** returned an error for a non-numeric `page`/`limit`.
- **Validation errors** for leave dates and due dates returned HTTP 500; they now return 400.
- **Malformed JSON** body returned 500; now 400. Unexpected 500 details are hidden when `NODE_ENV=production`.
- **Query injection:** filter values such as `?status[$ne]=x` are ignored; only plain strings are accepted.
- **Mass assignment:** create/update only accept the intended fields (a client can no longer overwrite `taskId`, `_id` and similar).
- **CSV export:** dates are written as `YYYY-MM-DD` instead of long JavaScript date text; cells starting with `=`, `+`, `-` or `@` are neutralised so spreadsheets do not run them as formulas; UTF-8 BOM added for Excel.
- **Dashboard overdue count** is now counted by the database instead of loading every task.
- **Time zones:** overdue, leave and displayed dates now treat dates as calendar days, so they are correct outside the server's own time zone.
- **Stale results:** fast typing in the search boxes could show an older response over a newer one; fixed.
- **Concurrency:** the "maximum 3 active tasks" rule is now protected against two simultaneous requests (see README note 6).

## Added
- `npm test` in `server/` (40 tests, no database needed).
- `.gitignore`, `engines` field, client `package-lock.json`, this file.
- Vite port fixed to 5173 so it always matches `CLIENT_URL`.

## Removed from the zip
- `node_modules/` (run `npm install`), your local `.env`, and the editor-generated `CLAUDE.md` / `.claude/` notes.
