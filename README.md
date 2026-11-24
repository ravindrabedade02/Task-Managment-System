# Employee & Task Management System — Roots Media Marketing Assignment

A full-stack MERN application for managing employees, assigning tasks, tracking workload and exporting filtered task data. The database is **MongoDB Atlas**.

## Stack
- React + Vite, React Router, Axios
- Node.js + Express
- MongoDB Atlas + Mongoose
- Reusable UI components and responsive CSS

## Features
- Dashboard metrics and employee workload are calculated by the API.
- Employee CRUD with normalized/unique email, unique Employee ID, leave validation and protected deletion.
- Task CRUD, server-side search/filter/sort/pagination and a status-only transition endpoint.
- Assignment rules: active employees only; on-leave employees are blocked when the task start date falls within their inclusive leave dates; maximum 3 active tasks per employee.
- Due-date validation, backend completion timestamp and immutable completed/cancelled tasks.
- Overdue flag calculated consistently by the API.
- CSV export includes every task matching the active filters, not just the current page.
- Task filters/search/sort/page are synchronized with the URL.

## Requirements
- Node.js 18 or newer (check with `node -v`)
- A MongoDB Atlas cluster (the free M0 tier is enough). Atlas is a replica set, which task assignment needs because it uses transactions. A plain local `mongod` will not work for creating tasks.

---

## Quick start

### 1. Set up MongoDB Atlas (one time)
1. **Database Access** > *Add New Database User* > password authentication, role *Read and write to any database*. Save the username and password.
2. **Network Access** > *Add IP Address* > *Add Current IP Address* (or `0.0.0.0/0` for development only). Wait until it shows *Active*.
3. **Clusters** > *Connect* on your cluster > *Drivers* > *Node.js* > copy the connection string.

### 2. Start the backend
Windows (PowerShell or Command Prompt):
```bash
cd server
copy .env.example .env
notepad .env
npm install
npm run dev
```
macOS / Linux:
```bash
cd server
cp .env.example .env
nano .env
npm install
npm run dev
```
In `.env`, replace `MONGO_URI` with your Atlas string. Replace `<db_username>` and `<db_password>` completely (remove the `< >`), and keep the database name `roots_employee_tasks` before the `?`.

You should see:
```
MongoDB connected: <your-cluster-host> / database "roots_employee_tasks"
API running on http://localhost:5000
```
Check it: open http://localhost:5000/api/health. It should show `{"status":"ok","database":"connected"}`.

> After editing `.env`, stop the server (Ctrl+C) and run `npm run dev` again. Changes to `.env` are not picked up automatically.

### 3. Start the frontend
Open a **second** terminal:
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173. (`client/.env` is optional: the app already defaults to `http://localhost:5000/api`. Copy `.env.example` to `.env` only if your API runs elsewhere.)

### 4. Run the tests (no database needed)
```bash
cd server
npm test
```

### 5. Production build (optional)
```bash
cd client
npm run build        # output in client/dist
cd ../server
npm start            # runs without nodemon
```

---

## Environment variables

Server `server/.env`:
| Variable | Required | Meaning |
|---|---|---|
| `MONGO_URI` | yes | MongoDB Atlas connection string (`MONGODB_URI` is also accepted) |
| `PORT` | no | API port, default `5000` |
| `CLIENT_URL` | no | Allowed browser origin(s), comma-separated. Default in the template: `http://localhost:5173` |
| `MONGO_DB_NAME` | no | Database name to use only if the URI does not contain one (default `roots_employee_tasks`) |
| `DNS_SERVERS` | no | e.g. `8.8.8.8,1.1.1.1`, only to fix Atlas DNS (`querySrv`) errors |

Client `client/.env`:
- `VITE_API_URL` — backend base URL, e.g. `http://localhost:5000/api`

Never commit or share `.env` (it contains your database password). `.gitignore` already excludes it.

## Troubleshooting

| Message | What to do |
|---|---|
| `MONGO_URI still contains a placeholder` | Replace the whole `<db_password>` (brackets included) with your real password. |
| `bad auth` / `Authentication failed` | Wrong database username or password. Check Atlas > Database Access. URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `/` → `%2F`). |
| `Server selection timed out` / `ReplicaSetNoPrimary` | Your IP is not allowed. Add it in Atlas > Network Access. Also check that the cluster is not paused (free clusters pause after inactivity). |
| `querySrv ECONNREFUSED` / `ENOTFOUND` | DNS problem on your network. Add `DNS_SERVERS=8.8.8.8,1.1.1.1` to `server/.env`, or switch your PC's DNS to 8.8.8.8. |
| Browser shows a CORS error | `CLIENT_URL` in `server/.env` must match the address in the browser, including the port. Restart the API after changing it. |
| `Port 5000 is already in use` | Stop the other program or change `PORT` in `server/.env` (and `VITE_API_URL` in `client/.env`). |
| `Port 5173 is already in use` (Vite) | Close the other Vite window. The port is fixed on purpose so it matches `CLIENT_URL`. |
| `This database does not support transactions` | You are connected to a standalone MongoDB. Use the Atlas connection string. |

## API overview

### Health
- `GET /api/health` — API status and database connection state

### Employees
- `GET /api/employees?page=1&limit=10&search=&department=&status=&sortBy=createdAt&order=desc`
- `POST /api/employees`
- `GET /api/employees/:id`
- `PUT /api/employees/:id` (Employee ID cannot be changed)
- `DELETE /api/employees/:id`

### Tasks
- `GET /api/tasks?page=1&limit=10&search=&department=&priority=&status=&dueFrom=&dueTo=&sortBy=createdAt&order=desc`
  - `sortBy` can be `createdAt`, `dueDate`, `priority` (Critical > High > Medium > Low) or `title`
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `PUT /api/tasks/:id`
- `PUT /api/tasks/:id/status` with `{ "status": "In Progress" }`
- `DELETE /api/tasks/:id`
- `GET /api/tasks/export/csv` — applies the same filters/search/sort, ignores pagination.

### Dashboard
- `GET /api/dashboard`

## Data model and Employee → Task relationship
- Employee has a unique `employeeId` and normalized unique `email`.
- Task stores `assignedEmployee` as an ObjectId reference and also stores an `employeeSnapshot` (name, employee ID, department). The snapshot preserves useful historical employee details if an employee is later deleted.
- Task department is stored on the task as an assignment-time value.
- Active tasks are tasks in `Todo` or `In Progress`.
- Task also keeps an internal `priorityRank` (Low=1 … Critical=4) so priority sorts by importance. It is set by the server and not returned by the API.

## Business-rule implementation notes
1. **Status transitions:** validated in `PUT /api/tasks/:id/status`, not in the ordinary task update route. This keeps the state machine centralized and prevents clients bypassing allowed transitions.
2. **Completed Date:** set by the backend when a task transitions to `Completed`; the client cannot supply it, preventing forged completion dates.
3. **Inactive / on-leave assignment:** the task service loads the employee and validates status and inclusive leave dates against the task Start Date before saving. On-leave employees appear in the task form's employee list (marked "On Leave") because they can still be assigned work that starts outside their leave.
4. **Backend filtering/pagination:** only the requested page and matching records are returned; this avoids downloading the entire collection and keeps results consistent for large datasets. Search text is escaped and filter values must be plain strings.
5. **URL filters:** shareable URLs, refresh persistence and browser back/forward navigation reproduce the same task-list view.
6. **Two simultaneous 4th-task requests:** a plain count-then-insert can race (both requests see two active tasks). Task creation and editing run inside a MongoDB transaction and first update the employee document (`assignmentVersion`). Two concurrent requests for the same employee therefore conflict, MongoDB retries one of them, and the retry sees the other task and applies the 3-task limit. This relies on Atlas transaction behaviour; the unit tests cover the logic with fakes, so it is worth confirming once against Atlas by sending two simultaneous requests for an employee that already has 2 active tasks.
7. **Dates:** due, start and leave dates are calendar days (stored as UTC midnight). Overdue and leave checks compare calendar days, so they give the same answer in any server time zone.

## Assumptions
- No authentication is required, as specified.
- Employee phone is stored as a string to preserve leading zeros and country codes.
- Skills are stored as an array of strings.
- Task IDs are generated as `TSK-` plus a short unique suffix.
- Overdue means the current date (server-local calendar date) is later than Due Date and status is neither Completed nor Cancelled.
- Employee historical information is retained on each task through `employeeSnapshot`.
