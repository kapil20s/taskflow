# ⚡ TaskFlow — Team Task Manager

A full-stack collaborative task management application built with **React + Node.js/Express + LibSQL (SQLite)**.

Manage projects, assign tasks, track progress, and collaborate with your team — with role-based access control.

---

## Live Demo

| Service | URL |
|---------|-----|
| Live Application Url | https://task-flows-production.up.railway.app/ |


---

## Features

- **JWT Authentication** — Signup/Login with secure token-based auth
- **Project Management** — Create projects, add/remove members
- **Kanban Board** — Drag-free visual board with To Do / In Progress / Done columns
- **Task Management** — Title, description, due date, priority (High/Medium/Low), assignee
- **Role-Based Access Control** — Admin vs Member permissions enforced on both frontend and backend
- **Dashboard** — Task stats, status breakdown, overdue tasks, tasks per user, project overview
- **My Tasks** — Personal task view with inline status updates
- **Overdue Detection** — Visual warnings for tasks past their due date
- **Responsive** — Works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Axios |
| Backend | Node.js, Express 4 |
| Database | LibSQL (SQLite-compatible, Railway-safe) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Deployment | Railway |

---

## Project Structure

```
taskflow/
├── backend/
│   ├── server.js          # Express app entrypoint
│   ├── db.js              # Database connection & schema
│   ├── middleware/
│   │   └── auth.js        # JWT auth + role middleware
│   ├── routes/
│   │   ├── auth.js        # /api/auth/* endpoints
│   │   ├── projects.js    # /api/projects/* endpoints
│   │   ├── tasks.js       # /api/projects/:id/tasks/* endpoints
│   │   └── dashboard.js   # /api/dashboard endpoint
│   ├── railway.toml
│   └── package.json
│
└── frontend-app/
    ├── src/
    │   ├── App.jsx         # Root component + routing
    │   ├── AuthContext.jsx # Auth state management
    │   ├── api.js          # Axios client with interceptors
    │   ├── index.css       # Full design system
    │   ├── LoginPage.jsx
    │   ├── SignupPage.jsx
    │   ├── Sidebar.jsx
    │   ├── Dashboard.jsx
    │   ├── ProjectsPage.jsx
    │   ├── ProjectDetail.jsx  # Kanban + List + Members
    │   ├── MyTasksPage.jsx
    │   └── TaskModal.jsx
    ├── railway.toml
    └── package.json
```

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | None | Register new user |
| POST | `/api/auth/login` | None | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Get current user |

### Projects
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | JWT | List user's projects |
| POST | `/api/projects` | JWT | Create project (creator = Admin) |
| GET | `/api/projects/:id` | Member | Project details + members |
| DELETE | `/api/projects/:id` | Admin | Delete project |
| POST | `/api/projects/:id/members` | Admin | Add member by email |
| DELETE | `/api/projects/:id/members/:uid` | Admin | Remove member |

### Tasks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects/:id/tasks` | Member | List tasks (filterable) |
| POST | `/api/projects/:id/tasks` | Admin | Create task |
| PATCH | `/api/projects/:id/tasks/:tid` | Admin/Assignee | Update task |
| DELETE | `/api/projects/:id/tasks/:tid` | Admin | Delete task |

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard` | JWT | Full stats for current user |

---

## Role-Based Access Control

| Action | Admin | Member |
|--------|-------|--------|
| Create/delete project | ✅ | ❌ |
| Add/remove members | ✅ | ❌ |
| Create/delete tasks | ✅ | ❌ |
| Edit task (all fields) | ✅ | ❌ |
| Update assigned task status | ✅ | ✅ |
| View project + tasks | ✅ | ✅ |

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone the repo

```bash
git clone https://github.com/your-username/taskflow.git
cd taskflow
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set a strong JWT_SECRET
npm install
npm start
# API running at http://localhost:3001
```

### 3. Setup Frontend

```bash
cd frontend-app
cp .env.example .env
# .env already points to http://localhost:3001/api for local dev
npm install
npm run dev
# Frontend running at http://localhost:5173
```

---

## Deployment on Railway

### Backend

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub Repo
2. Select the `backend/` folder (or set Root Directory to `/backend`)
3. Set environment variables:
   ```
   JWT_SECRET=your-long-random-secret-here
   FRONTEND_URL=https://your-frontend.railway.app
   PORT=3001
   ```
4. Railway auto-detects Node.js and runs `npm start`

### Frontend

1. New Service → GitHub → select `frontend-app/` folder
2. Set environment variables:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```
3. Build command: `npm run build`
4. Start command: `npx serve dist -p $PORT`

### Database

The app uses **LibSQL** with a local file database (`taskflow.db`). For Railway persistence:
- The DB file is created automatically on first run
- For production durability, consider upgrading to **Turso** (hosted LibSQL) and setting `DATABASE_URL` to the Turso connection string

---

## Database Schema

```sql
users (id, name, email, password, created_at)

projects (id, name, description, admin_id, created_at)

project_members (project_id, user_id, role, joined_at)
-- role: 'admin' | 'member'

tasks (id, project_id, title, description, due_date, priority,
       status, assignee_id, created_by, created_at, updated_at)
-- priority: 'low' | 'medium' | 'high'
-- status: 'todo' | 'in_progress' | 'done'
```

---

## Design Decisions

1. **LibSQL over SQLite3/better-sqlite3**: Native bindings (`sqlite3`, `better-sqlite3`) require build tools (`node-gyp`) not always available in CI/CD. `@libsql/client` is pure JS and works everywhere including Railway out of the box.

2. **No frontend router library**: The app uses simple state-based routing (`view` string) to keep the bundle lean and avoid React Router configuration overhead for this scale.

3. **JWT in localStorage**: Simple and effective for this use case. For higher security requirements, httpOnly cookies would be preferable.

4. **Cascade deletes**: Project deletion cascades to members and tasks at the DB level — no orphaned rows.

5. **Member-only task visibility**: A user cannot see tasks in projects they don't belong to — enforced at the API middleware layer.

---

## Demo Credentials

**Local dev:** After starting the backend once, a demo user is seeded automatically:

- Email: `demo@taskflow.app`
- Password: `demo123`

**Smoke check (manual):** With frontend on `http://localhost:5173` and API on `http://localhost:3001`, sign in with the credentials above — you should land on the dashboard. Wrong password should show a red inline error under the fields and **keep** your typed email/password (no full-page reload).

Create an account via `/signup`, then:
- Create a project (you become Admin)
- Add teammates by their registered email
- Create and assign tasks
- Team members can update status on their tasks

---

## Author

Built as a full-stack coding assignment demonstrating:
- RESTful API design with Express
- JWT authentication & authorization
- Role-based access control
- Relational data modeling
- React state management without heavy frameworks
- Production deployment on Railway
