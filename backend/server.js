// connects database.js to server.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// express-session refuses to start without a secret, so fail early with a clear message
if (!process.env.SESSION_SECRET) {
    console.error("Missing SESSION_SECRET. Copy backend/.env.example to backend/.env and set a value (see README).");
    process.exit(1);
}

const express = require("express");
const cors = require("cors");

const db = require("./database");
const bcrypt = require("bcrypt");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);

// for input validation
const { asString, validateUsername, validateDisplayName, validatePassword } = require("./validator");

// app setup
const app = express();
const PORT = 3000;

// middleware
app.use(cors({
    origin: "http://127.0.0.1:5500",
    credentials: true
}));
app.use(express.json());

// Express leaves req.body undefined when a request has no JSON body
app.use((req, res, next) => {
    req.body = req.body ?? {};
    next();
});

// makes the session last 24 hours
app.use(session({
    store: new SQLiteStore({
        db: "sessions.db",
        dir: __dirname
    }),
    secret: process.env.SESSION_SECRET,
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
    const username = asString(req.body.username);
    const display_name = asString(req.body.display_name);
    const pw = typeof req.body.pw === "string" ? req.body.pw : ""; // can't use asString here since asString trims

    // validate required fields
    if (!username || !display_name || !pw) {
        return res.status(400).json({error: "All fields are required."});
    }

    const problem = validateUsername(username) || validateDisplayName(display_name) || validatePassword(pw);

    if (problem) {
        return res.status(400).json({error: problem});
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
    let result;

    try {
        result = db.prepare(`
            INSERT INTO User (username, display_name, pw_hash)
            VALUES (?, ?, ?)
        `).run(username, display_name, pw_hash);
    } catch (err) {
        // someone registered the same username between the check above and this insert
        if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({error: "Username is already taken."});
        }

        throw err;
    }

    // acc created !
    req.session.userId = result.lastInsertRowid;      // session is for this user;  
    createList("My Tasks", result.lastInsertRowid, "personal");

    res.status(201).json({
        message: "Account created successfully.",
        user_id: result.lastInsertRowid
    });
})

app.post("/api/auth/login", async (req, res) => {
    // get un and pw
    const username = asString(req.body.username);
    const pw = typeof req.body.pw === "string" ? req.body.pw : ""; // can't use asString here since asString trims

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

// LIST HELPERS
// creates the list and its owner's membership together, or neither
const createList = db.transaction((name, owner_id, type = "collab") => {
    const { lastInsertRowid: list_id } = db
        .prepare("INSERT INTO List (name, owner_id, type) VALUES (?, ?, ?)")
        .run(name, owner_id, type);
    db.prepare("INSERT INTO ListMember (list_id, user_id) VALUES (?, ?)")
        .run(list_id, owner_id);
});

// blocks users who aren't in the list; ownership comes from List.owner_id only
function requireMember(req, res, next) {
    const list_id = Number(req.params.listId);

    const list = db.prepare(`
        SELECT l.owner_id, l.type
        FROM List l
        JOIN ListMember lm ON lm.list_id = l.list_id
        WHERE l.list_id = ? AND lm.user_id = ?
    `).get(list_id, req.session.userId);

    // 404 instead of 403 so people can't probe which list ids exist
    if (!list) {
        return res.status(404).json({error: "List not found."});
    }

    req.listId = list_id;
    req.listType = list_type;
    req.isOwner = list.owner_id === req.session.userId;
    next();
}

function requireOwner(req, res, next) {
     if (!req.isOwner) {
        return res.status(403).json({error: "Only the list owner can do that."});
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
    const username = asString(req.body.username);
    const display_name = asString(req.body.display_name);

    if (!username || !display_name) {
        return res.status(400).json({error: "Username and display name are required."});
    }

    const problem = validateUsername(username) || validateDisplayName(display_name);

    if (problem) {
        return res.status(400).json({error: problem});
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

    try {
        db.prepare(`
            UPDATE User
            SET username = ?, display_name = ?
            WHERE user_id = ?
        `).run(username, display_name, req.session.userId);
    } catch (err) {
        // someone took this username between the check above and this update
        if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({error: "Username is already taken."});
        }

        throw err;
    }

    res.json({ message: "Profile updated!" });
});

// CHANGE PASSWORD
app.put("/api/profile/password", requireAuth, async (req, res) => {
    const current_pw = typeof req.body.current_pw === "string" ? req.body.current_pw : ""; // can't use asString here since asString trims
    const new_pw = typeof req.body.new_pw === "string" ? req.body.new_pw : "";

    // validate required fields
    if (!current_pw || !new_pw) {
        return res.status(400).json({error: "Current and new passwords are required."});
    }

    // validate new pw (characters: 8 min, 72 max)
    const problem = validatePassword(new_pw, "New password");

    if (problem) {
        return res.status(400).json({error: problem});
    } 

    if (new_pw === current_pw) {
        return res.status(400).json({error: "New password must be different from your current one."});
    }

    // get current user's pw hash
    const user = db.prepare(`
        SELECT pw_hash
        FROM User
        WHERE user_id = ?
    `).get(req.session.userId);

    if (!user) {
        return res.status(404).json({error: "User not found."});
    }

    // verify current pw
    const pwMatch = await bcrypt.compare(current_pw, user.pw_hash);
    if (!pwMatch) {
        return res.status(403).json({error: "Current password is incorrect."});
    }

    // hash new pw
    const newPwHash = await bcrypt.hash(new_pw, 10);

    // save new pw
    db.prepare(`
        UPDATE User
        SET pw_hash = ?
        WHERE user_id = ?
    `).run(newPwHash, req.session.userId);

    res.json({ message: "Password updated."});
});

// Express error-handling middleware; catches anything a route throws, so the frontend always gets JSON instead of an HTML error page
app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({error: "Invalid JSON."}); // bad request
    }

    console.error(err);
    res.status(500).json({error: "Something went wrong on the server."}); // internal server error
});

// start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});