const bcrypt = require("bcrypt");
const db = require("./database");

const users = [
    {
        username: "sei",
        display_name: "Sei",
        password: "seiiiiii"
    }, 
    {
        username: "demo",
        display_name: "Demo user",
        password: "demo1234"
    }
];

const tasksByUsername = {
    sei: [
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
    ],
    demo: [
        {
            title: "Demo Task 1",
            due: "2026-10-06 18:00:00",
            priority: "High",
            tag: "School"
        },
        {
            title: "Demo Task 2",
            due: "2026-10-07 20:00:00",
            priority: "Medium",
            tag: "School"
        },
        {
            title: "Demo Task 3",
            due: null,
            priority: "Low",
            tag: "Personal"
        }
    ]
};

const insertUser = db.prepare(`
    INSERT INTO User (
        username,
        display_name,
        pw_hash
    )
    VALUES (?, ?, ?)
`);



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

for (const userData of users) {
    let user = db.prepare(`
        SELECT user_id, username
        FROM User
        WHERE username = ?
    `).get(userData.username);

    if (!user) {
        const pwHash = bcrypt.hashSync(userData.password, 10);

        const result = insertUser.run(
            userData.username,
            userData.display_name,
            pwHash
        );

        user = {
            user_id: result.lastInsertRowid,
            username: userData.username
        };

        console.log(`Created user: ${userData.username}`);
    } else {
        console.log(`User already exists: ${userData.username}`);
    }

    const tasks = tasksByUsername[userData.username] || [];

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

    console.log(`Seeded tasks for user: ${userData.username}`);
}

console.log(`Database seeding complete`);