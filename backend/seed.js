// Usage:
//   node seed.js          adds demo data (safe to run repeatedly) and repairs accounts that have no personal list
//   node seed.js --reset  wipes ALL users, lists and tasks first, then seeds
const bcrypt = require("bcrypt");
const db = require("./database");

const RESET = process.argv.includes("--reset");
const PASSWORD = "password123";

const DEMO_USERS = [
    { username: "nikko", display_name: "Nikko" },
    { username: "victor", display_name: "Victor" },
    { username: "bea", display_name: "Bea" },      // in no shared lists, for testing access control
];

function getOrCreateUser({ username, display_name }, pw_hash) {
    const existing = db.prepare("SELECT user_id FROM User WHERE username = ?").get(username);

    if (existing) {
        return existing.user_id;
    }

    return db.prepare(`
        INSERT INTO User (username, display_name, pw_hash) VALUES (?, ?, ?)
    `).run(username, display_name, pw_hash).lastInsertRowid;
}

// finds the list or creates it, with its owner as a member
function getOrCreateList(name, owner_id, type) {
    const existing = type === "personal"
        ? db.prepare("SELECT list_id FROM List WHERE owner_id = ? AND type = 'personal'").get(owner_id)
        : db.prepare("SELECT list_id FROM List WHERE owner_id = ? AND name = ? AND type = ?").get(owner_id, name, type);

    const list_id = existing
        ? existing.list_id
        : db.prepare("INSERT INTO List (name, owner_id, type) VALUES (?, ?, ?)").run(name, owner_id, type).lastInsertRowid;

    db.prepare("INSERT OR IGNORE INTO ListMember (list_id, user_id) VALUES (?, ?)").run(list_id, owner_id);

    return list_id;
}

function addMember(list_id, user_id) {
    db.prepare("INSERT OR IGNORE INTO ListMember (list_id, user_id) VALUES (?, ?)").run(list_id, user_id);
}

// only seeds tasks into empty lists, so re-running never duplicates them
function addTasks(list_id, tasks) {
    const { count } = db.prepare("SELECT COUNT(*) AS count FROM Task WHERE list_id = ?").get(list_id);

    if (count > 0) {
        return;
    }

    const insert = db.prepare(`
        INSERT INTO Task (user_id, list_id, title, due, priority, tag, is_done)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of tasks) {
        insert.run(t.by, list_id, t.title, t.due ?? null, t.priority, t.tag, t.done ? 1 : 0);
    }
}

const seed = db.transaction(() => {
    if (RESET) {
        // order matters: foreign keys are ON
        db.exec("DELETE FROM Task; DELETE FROM ListMember; DELETE FROM List; DELETE FROM User;");
        db.exec("DELETE FROM sqlite_sequence WHERE name IN ('Task', 'List', 'User');");
        console.log("Database wiped.");
    }

    // 1) repair: every existing account must have a personal list
    const allUsers = db.prepare("SELECT user_id FROM User").all();

    for (const { user_id } of allUsers) {
        getOrCreateList("My Tasks", user_id, "personal");
    }

    // 2) demo accounts
    const pw_hash = bcrypt.hashSync(PASSWORD, 10);
    const id = {};

    for (const user of DEMO_USERS) {
        id[user.username] = getOrCreateUser(user, pw_hash);
        getOrCreateList("My Tasks", id[user.username], "personal");
    }

    // 3) personal tasks
    addTasks(getOrCreateList("My Tasks", id.nikko, "personal"), [
        { by: id.nikko, title: "Read Chapter 5", due: "2026-10-28T09:00", priority: "Medium", tag: "School" },
        { by: id.nikko, title: "Buy groceries", priority: "Low", tag: "Personal", done: true },
    ]);

    addTasks(getOrCreateList("My Tasks", id.victor, "personal"), [
        { by: id.victor, title: "Submit lab report", due: "2026-10-24T17:00", priority: "High", tag: "School" },
    ]);

    addTasks(getOrCreateList("My Tasks", id.bea, "personal"), [
        { by: id.bea, title: "Bea's private task", priority: "Low", tag: "Personal" },
    ]);

    // 4) the rubric scenario: Nikko owns a group list and adds Victor,
    //    Victor owns his own group list that Nikko is NOT in
    const nikkoGroup = getOrCreateList("Nikko's Group List", id.nikko, "collab");
    addMember(nikkoGroup, id.victor);

    addTasks(nikkoGroup, [
        { by: id.nikko, title: "Draft project proposal", due: "2026-10-26T12:00", priority: "High", tag: "School" },
        { by: id.victor, title: "Make the slides", due: "2026-10-27T18:00", priority: "Medium", tag: "School" },
        { by: id.victor, title: "Book a meeting room", priority: "Low", tag: "Others", done: true },
    ]);

    const victorGroup = getOrCreateList("Victor's Group List", id.victor, "collab");

    addTasks(victorGroup, [
        { by: id.victor, title: "Victor-only group task", priority: "Medium", tag: "Others" },
    ]);
});

seed();

console.log(`
Seeded. Demo logins (password: ${PASSWORD})
  nikko   sees: My Tasks, Nikko's Group List
  victor  sees: My Tasks, Victor's Group List, Nikko's Group List (added by Nikko)
  bea     sees: My Tasks only
`);