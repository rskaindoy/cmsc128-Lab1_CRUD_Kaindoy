// connects database.js to server.js

const express = require("express");
const cors = require("cors");

const db = require("./database");

const app = express();
const PORT = 3000;

// middleware
app.use(cors());
app.use(express.json());

// TODO: Add API routes here
/** Example:
 * GET      /api/tasks
 * POST     /api/tasks
 * PUT      /api/tasks/:id
 * DELETE   /api/tasks/:id
 */

// test route
app.get("/", (req, res) => {
    res.send("Lista API is running!");
});

// create a task
app.post("/api/tasks", (req, res) => {
    const { title, due, priority, tag } = req.body;

    const statement = db.prepare(`
        INSERT INTO Task (title, due, priority, tag)
        VALUES (?, ?, ?, ?)
    `);

    const result = statement.run(title, due, priority, tag);

    res.json({
        task_id: result.lastInsertRowid,
        message: "Task created!"
    });
});


// get all active tasks
app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare(`
        SELECT *
        FROM Task
        WHERE deleted_at IS NULL
        ORDER BY due ASC
    `).all();

    res.json(tasks);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});