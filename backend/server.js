// connects database.js to server.js

const express = require("express");
const cors = require("cors");

const db = require("./database");
const bcrypt = require("bcrypt");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);

// app setup
const app = express();
const PORT = 3000;

// middleware
app.use(cors({
    origin: "http://127.0.0.1:5500",
    credentials: true
}));
app.use(express.json());

// makes the session last 24 hours
app.use(session({
    store: new SQLiteStore({
        db: "sessions.db",
        dir: "./"
    }),
    secret: "usad-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// test route
app.get("/", (req, res) => {
    res.send("Lista API is running!");
});


// AUTHENTICATION ROUTES
app.post("/api/auth/register", async (req, res) => {
    // get un, display name, pw
    const username = (req.body.username || "").trim();
    const display_name = (req.body.display_name || "").trim();
    const pw = req.body.pw || "";

    // validate required fields
    if (!username || !display_name || !pw) {
        return res.status(400).json({error: "All fields are required."});
    }

    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({error: "Username must be 3-20 characters: a combination of letters, numbers, and underscores only."});
    } 

    if (pw.length < 8) {
        return res.status(400).json({error: "Password must be at least 8 characters."});
    } 

    // check duplicate un (if un alr exists)
    const existingUser = db.prepare(`
            SELECT user_id
            FROM User
            WHERE username = ?
        `).get(username);
    
    if (existingUser) {
        return res.status(409).json({error: "Username is already taken."});
    }

    // hash pw
    const pw_hash = await bcrypt.hash(pw, 10);
    
    // save user
    const result = db.prepare(`
        INSERT INTO User (username, display_name, pw_hash)
        VALUES (?, ?, ?)
    `).run(username, display_name, pw_hash); 

    // acc created !
    req.session.userId = result.lastInsertRowid;      // session is for this user;  

    res.status(201).json({
        message: "Account created successfully.",
        user_id: result.lastInsertRowid
    });
})

app.post("/api/auth/login", async (req, res) => {
    // get un and pw
    const { username, pw } = req.body;

    // validate required fields
    if (!username || !pw) {
        return res.status(400).json({error: "All fields are required."});
    }

    // find user
    const user = db.prepare(`
            SELECT user_id, username, display_name, pw_hash
            FROM User
            WHERE username = ?
        `).get(username);

    // check if user exists
    if (!user) {
        return res.status(401).json({error: "Invalid username."});
    }

    // check pw
    const pw_match = await bcrypt.compare(pw, user.pw_hash);

    if (!pw_match) {
        return res.status(401).json({error: "Invalid password."});
    }

    // login successful !

    req.session.userId = user.user_id;      // session is for this user;  

    res.json({
        message: "Login successful.",
        user: {
            user_id: user.user_id,
            username: user.username,
            display_name: user.display_name
        }
    });

})

app.get("/api/auth/me", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({error: "Not authenticated"});
    }

    const user = db.prepare(`
        SELECT user_id, username, display_name
        FROM User
        WHERE user_id = ?
    `).get(req.session.userId);

    if (!user) {
        return res.status(401).json({error: "User not found"});
    }

    res.json({
        user: user
    })
})

app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({error: "Could not log out"});
        }
    
        res.clearCookie("connect.sid");

        res.json({
            message: "Logout successful."
        });
   })
})


// CRUD ROUTES
// CREATE TASK
app.post("/api/tasks", requireAuth, (req, res) => {
    const { title, due, priority, tag } = req.body;
    const user_id = req.session.userId;

    const statement = db.prepare(`
        INSERT INTO Task (user_id, title, due, priority, tag)
        VALUES (?, ?, ?, ?, ?)
    `);

    const result = statement.run(user_id, title, due, priority, tag);

    res.status(201).json({
        message: "Task created!",
        task_id: result.lastInsertRowid
    });
});


// READ TASKS
app.get("/api/tasks", requireAuth, (req, res) => {
    const tasks = db.prepare(`
        SELECT *
        FROM Task
        WHERE user_id = ?
        AND deleted_at IS NULL
        ORDER BY due ASC
    `).all(req.session.userId);

    res.json(tasks);
});


// UPDATE TASK
app.put("/api/tasks/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    const { title, due, priority, tag } = req.body;

    const statement = db.prepare(`
        UPDATE Task
        SET title = ?, due = ?, priority = ?, tag = ?
        WHERE task_id = ?
        AND user_id = ?
    `);

    const result = statement.run(title, due, priority, tag, id, req.session.userId);

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
app.delete("/api/tasks/:id", requireAuth, (req, res) => {
    const { id } = req.params;

    const statement = db.prepare(`
        UPDATE Task
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE task_id = ?
        AND user_id = ?
        AND deleted_at is NULL
    `);

    const result = statement.run(id, req.session.userId);

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
app.put("/api/tasks/:id/restore", requireAuth, (req, res) => {
    const { id } = req.params;

    const statement = db.prepare(`
        UPDATE Task
        SET deleted_at = NULL
        WHERE task_id = ?
        AND user_id = ?
    `);

    const result = statement.run(id, req.session.userId);

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
app.put("/api/tasks/:id/done", requireAuth, (req, res) => {
    const { id } = req.params;
    const { is_done } = req.body;

    const statement = db.prepare(`
        UPDATE Task
        SET is_done = ?
        WHERE task_id = ?
        AND user_id = ?
        AND deleted_at IS NULL
    `);

    const result = statement.run(is_done ? 1 : 0, id, req.session.userId);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    res.json({
        message: is_done ? "Task marked as done!" : "Task marked as not done!"
    });
});

// blocks requests from people who aren't logged in
function requireAuth (req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({error: "Not authenticated"});
    }

    next();
}

// TODO: trash routes, delete forever feature


// PROFILE ROUTES
// GET PROFILE
app.get("/api/profile", requireAuth, (req, res) => {
    const user = db.prepare(`
        SELECT user_id, username, display_name, created_at
        FROM User
        WHERE user_id = ?
    `).get(req.session.userId);

    if (!user) {
        return res.status(404).json({error: "User not found."});
    }

    res.json({
        user: user
    })
})

// UPDATE PROFILE
app.put("/api/profile", requireAuth, (req, res) => {
    const username = (req.body.username || "").trim();
    const display_name = (req.body.display_name || "").trim();

    if (!username || !display_name) {
        return res.status(400).json({error: "Username and display name are required."});
    }

    // username must be unique, ignoring the user's own row
    const taken = db.prepare(`
        SELECT user_id
        FROM User
        WHERE username = ?
        AND user_id != ?
    `).get(username, req.session.userId);

    if (taken) {
        return res.status(409).json({error: "Username is already taken."});
    }

    db.prepare(`
        UPDATE User
        SET username = ?, display_name = ?
        WHERE user_id = ?
    `).run(username, display_name, req.session.userId);


    res.json({
        message: "Profile updated!"
    });
});

// start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});