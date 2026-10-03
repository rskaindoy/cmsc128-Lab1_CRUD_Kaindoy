const db = require("./database");

const user = db.prepare(`
    SELECT user_id, username
    FROM User
    ORDER BY user_id
    LIMIT 1
`).get();

if (!user) {
    console.log("No users found. Create an account first.");
    process.exit();
}

const tasks = [
    {
        title: "Finish CMSC 124 assignment",
        due: "2026-10-02 23:59:00",
        priority: "High",
        tag: "School"
    },
    {
        title: "Review Statistics notes",
        due: "2026-10-03 18:00:00",
        priority: "Medium",
        tag: "School"
    },
    {
        title: "Prepare presentation slides",
        due: "2026-10-05 20:00:00",
        priority: "High",
        tag: "School"
    },
    {
        title: "Clean up workspace",
        due: "2026-10-04 15:00:00",
        priority: "Low",
        tag: "Personal"
    },
    {
        title: "Plan tasks for next week",
        due: null,
        priority: "Medium",
        tag: "Others"
    }
];

const insertTask = db.prepare(`
    INSERT INTO Task (
        user_id,
        title,
        due,
        priority,
        tag
    )
    VALUES (?, ?, ?, ?, ?)
`);

for (const task of tasks) {
    const existingTask = db.prepare(`
        SELECT task_id
        FROM Task
        WHERE user_id = ?
        AND title = ?
    `).get(user.user_id, task.title);

    if (!existingTask) {
        insertTask.run(
            user.user_id,
            task.title,
            task.due,
            task.priority,
            task.tag
        );
    }
}

console.log(`Seeded tasks for user: ${user.username}`);