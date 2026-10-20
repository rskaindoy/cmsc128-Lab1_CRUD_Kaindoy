# USAD

**One step at a time.**
*Matatapos din 'yan.*

USAD is a simple, personal task management web application with user accounts. Each user signs up, logs in, and manages their own tasks, keeping track of what they need to do and stay organized.

## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- SQLite through `better-sqlite3` (`lista.db`)

### Why these technologies?
I chose HTML, CSS, and JavaScript for the frontend because they are lightweight and straightforward for building the application's user interface. Node.js and Express.js are used for the backend as they allow us to create a simple REST API for handling task operations. SQLite was chosen as the database because it is lightweight, easy to set up locally, and does not require a separate database server. `better-sqlite3` provides a simple way for the Node.js backend to interact with the SQLite database.

## Current Features
**Tasks**
- Add, edit, delete (with confirmation and undo), and complete tasks
- Filter tasks by status, category, and priority (Low/Medium/High)
- Sort tasks by date added, due date, priority, and category
- Overdue badge
- Persistent task storage using SQLite

**Accounts and Authentication**
- Sign up with a username, display name, and password (validated, passwords hashed)
- Log in, log out, and stay logged in after a refresh or server restart
- Profile page where user can view and change their username, display name, and password
- All account, profile, and task routes are protected on the server

## How to Run Locally

### Prerequisites

Make sure you have:
- Node.js installed
- npm installed
- VS Code with Live Server and SQLite Viewer extensions

1. Clone the Repository
```bash
git clone https://github.com/rskaindoy/cmsc128-Lab1_CRUD_Kaindoy.git
cd cmsc128-Lab1_CRUD_Kaindoy
```

2. Install the backend dependencies
```bash
cd backend
node npm install
```

3. Start the backend server:
```bash
node server.js
```
It runs at `http://localhost:3000`.

4. Start the frontend. Open `index.html` with Live Server. Use the address`http://127.0.0.1:5500`, not `localhost`, because the backend only accepts requests from that origin (CORS).

## Database setup
There is nothing to run by hand. `database.js` creates `lista.db` and its tables the first time the server starts.

| Table | Purpose |
| --- | --- |
| `User` | `user_id`, `username` (unique), `display_name`, `pw_hash`, `created_at` |
| `Task` | `task_id`, `user_id`, `title`, `due`, `priority`, `tag`, `is_done`, `created_at`, `deleted_at` |

Sessions live in a separate file, `sessions.db`, managed by `connect-sqlite3`.

The project includes a seeder that populates lista.db with (2) sample users and their tasks for testing and demonstration. The seeder adds the sample records to the existing database without clearing or replacing existing users or tasks.

Run the seeder with:
```bash
node backend/seed.js
```

To inspect the data, open `lista.db` with `SQLite Viewer` extension in VSCode. `pw_hash` holds a bcrypt hash that starts with `$2b$10$`, never the real password. The `.db` files are listed in `.gitignore`.

## API endpoints

All routes start with `/api`. Requests and responses are JSON. Routes marked *login required* return `401` without a valid session cookie.

**Authentication**

| Method | Route | Description |
| --- | --- | --- |
| POST | `/auth/register` | Create an account and log in |
| POST | `/auth/login` | Log in |
| GET | `/auth/me` | Current user (used to restore the session) |
| POST | `/auth/logout` | Destroy the session |

**Profile** (login required)

| Method | Route | Description |
| --- | --- | --- |
| GET | `/profile` | Get username, display name and created date |
| PUT | `/profile` | Update username and display name |
| PUT | `/profile/password` | Change password (needs the current password) |

**Tasks** (login required, each user only sees their own)

| Method | Route | Description |
| --- | --- | --- |
| GET | `/tasks` | List tasks |
| POST | `/tasks` | Create a task |
| PUT | `/tasks/:id` | Edit a task |
| PUT | `/tasks/:id/done` | Mark done or not done |
| DELETE | `/tasks/:id` | Delete a task (soft delete) |
| PUT | `/tasks/:id/restore` | Undo a delete |

Validation rules: usernames are 3-20 characters (letters, numbers, underscores); passwords are 8-72 characters.

## How sessions work

1. On login or registration the server stores `userId` in a server-side session.
2. The session is saved in `sessions.db` (SQLite). The browser only receives a cookie (`connect.sid`) containing the session ID, never the user's data.
3. The cookie lasts 24 hours. Because the session is in a database, the user stays logged in after a page refresh, after using the back/forward buttons, and after a backend restart.
4. When the page loads, the frontend calls `GET /api/auth/me` to restore the logged-in state.
5. Logging out destroys the session on the server and clears the cookie. Protected routes use a `requireAuth` middleware, so the API refuses requests after logout.

## Screenshots
Dashboard
<img width="1680" height="964" alt="Screenshot 2026-09-11 at 11 54 09 PM" src="https://github.com/user-attachments/assets/39e79aaf-19d5-4be3-b203-232184f23fc8" />

Adding a Task
<img width="1680" height="964" alt="Screenshot 2026-09-11 at 11 54 25 PM" src="https://github.com/user-attachments/assets/69e1bce9-6f9c-4968-ac3d-cb583c4f9414" />

Editing a Task
<img width="1680" height="964" alt="Screenshot 2026-09-11 at 11 54 40 PM" src="https://github.com/user-attachments/assets/5866fb04-ce8d-4edd-99b6-7dc61aff425d" />

Deleting a Task (Confirmation Pop-up)
<img width="1680" height="964" alt="Screenshot 2026-09-11 at 11 55 13 PM" src="https://github.com/user-attachments/assets/8810b8f0-a50a-47f1-af7a-1b797f59b464" />

Working Filter System
<img width="1680" height="964" alt="Screenshot 2026-09-11 at 11 55 04 PM" src="https://github.com/user-attachments/assets/b53fd950-249d-44f7-9917-7d4256bfed51" />



