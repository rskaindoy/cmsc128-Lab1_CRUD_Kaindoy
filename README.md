# USAD

**One step at a time.**
*Matatapos din 'yan. Uusad ka rin.*

USAD is a simple task management web application that helps users keep track of what they need to do and stay organized.

## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- SQLite
- better-sqlite3 (Node.js SQLite library)

### Why these technologies?
I chose HTML, CSS, and JavaScript for the frontend because they are lightweight and straightforward for building the application's user interface. Node.js and Express.js are used for the backend as they allow us to create a simple REST API for handling task operations. SQLite was chosen as the database because it is lightweight, easy to set up locally, and does not require a separate database server. `better-sqlite3` provides a simple way for the Node.js backend to interact with the SQLite database.

## Current Features
- Add tasks
- Edit tasks
- Delete tasks with confirmation
- Undo deleted tasks
- Mark tasks as completed
- Filter tasks by status, category, and priority
- Sort tasks by date added, due date, priority, and category
- Persistent task storage using SQLite

## How to Run Locally

### Prerequisites

Make sure you have:
- Node.js installed
- npm installed

1. Clone the Repository
```bash
git clone https://github.com/rskaindoy/cmsc128-Lab1_CRUD_Kaindoy.git
cd cmsc128-Lab1_CRUD_Kaindoy
```
2. Install the backend dependencies
3. Start the backend server:
```bash
cd backend
node server.js
```
4. Open frontend/index.html in your browser to use the application.

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



