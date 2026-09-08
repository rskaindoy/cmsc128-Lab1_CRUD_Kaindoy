// connects database.js to server.js

const express = require("express");
const cors = require("cors");

const db = require("./database");

const app = express();
const PORT = 3000;

// middleware
app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
    res.send("Lista API is running!");
});

// CREATE TASK
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


// READ TASKS
app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare(`
        SELECT *
        FROM Task
        WHERE deleted_at IS NULL
        ORDER BY due ASC
    `).all();

    res.json(tasks);
});


// UPDATE TASK
app.put("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const { title, due, priority, tag } = req.body;

    const statement = db.prepare(`
        UPDATE Task
        SET title = ?, due = ?, priority = ?, tag = ?
        WHERE task_id = ?
    `);

    const result = statement.run(title, due, priority, tag, id);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    res.json({
        message: "Task updated!"
    });
});

// DELETE TASK
app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;

    const statement = db.prepare(`
        UPDATE Task
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE task_id = ?
        AND deleted_at is NULL
    `);

    const result = statement.run(id);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    res.json({
        message: "Task deleted!"
    });
});

// RESTORE DELETED TASK
app.put("/api/tasks/:id/restore", (req, res) => {
    const { id } = req.params;

    const statement = db.prepare(`
        UPDATE Task
        SET deleted_at = NULL
        WHERE task_id = ?
    `);

    const result = statement.run(id);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    res.json({
        message: "Task restored!"
    });
});

// CHECK / UNCHECK TASKS
app.put("/api/tasks/:id/done", (req, res) => {
    const { id } = req.params;
    const { is_done } = req.body;

    const statement = db.prepare(`
        UPDATE Task
        SET is_done = ?
        WHERE task_id = ?
        AND deleted_at IS NULL
    `);

    const result = statement.run(is_done ? 1 : 0, id);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    res.json({
        message: is_done ? "Task marked as done!" : "Task marked as not done!"
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});