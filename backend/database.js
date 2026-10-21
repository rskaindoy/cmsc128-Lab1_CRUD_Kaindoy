const path = require("path");
const Database = require("better-sqlite3");

// always uses the db file located next to this file in the same directory, no matter which folder the server was started 
const db = new Database(path.join(__dirname, "lista.db"));

// enable foreign key constraints
db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS User (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        pw_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Task (
        task_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        list_id INTEGER NOT NULL,

        title VARCHAR(255) NOT NULL,
        due DATETIME,
        priority TEXT CHECK(priority IN ('Low', 'Medium', 'High')),
        tag TEXT,
        is_done BOOLEAN DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,

        FOREIGN KEY (user_id) REFERENCES User(user_id),
        FOREIGN KEY (list_id) REFERENCES List(list_id)
    );

    -- for COLLABORATIVE LISTS
    CREATE TABLE IF NOT EXISTS List (
        list_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'collab' CHECK(type IN ('personal', 'collab')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (owner_id) REFERENCES User(user_id)
    );

    -- owner included as a member
    CREATE TABLE IF NOT EXISTS ListMember (
        list_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,


        PRIMARY KEY (list_id, user_id),
        FOREIGN KEY (list_id) REFERENCES List(list_id),
        FOREIGN KEY (user_id) REFERENCES User(user_id)
    );
    
    -- a user can only ever have 1 personal list
    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_personal_list ON List(owner_id) WHERE type = 'personal';


    -- speeds up "which lists am I in" and "tasks of this list"
    CREATE INDEX IF NOT EXISTS idx_listmember_user ON ListMember(user_id);
    CREATE INDEX IF NOT EXISTS idx_task_list ON Task(list_id);
`);

module.exports = db;