const Database = require("better-sqlite3");

const db = new Database("lista.db");

// enable foreign key constraints
db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS User (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Task (
        task_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,

        title VARCHAR(255) NOT NULL,
        due DATETIME,
        priority TEXT CHECK(priority IN ('Low', 'Medium', 'High')),
        tag TEXT,
        is_done BOOLEAN DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,

        FOREIGN KEY (user_id) REFERENCES User(user_id)
    );
`);

module.exports = db;