console.log("Lista app loaded!");

// store API URL
const API_URL = "http://localhost:3000/api";

// get HTML elements
const addTaskButton = document.getElementById("add-task-button");
const closeTaskPanel = document.getElementById("close-task-panel");
const addTaskPanel = document.getElementById("add-task-panel");
const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");

// MANIPULATE TASK PANEL ---------------------

// open the add-task panel
addTaskButton.addEventListener("click", () => {
    addTaskPanel.style.display = "block";
});

// close the add-task panel
closeTaskPanel.addEventListener("click", () => {
    addTaskPanel.style.display = "none";
});


// CREATE TASK ---------------------
// submit filled-out task form
taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // get values from the form
    const title = document.getElementById("title").value;
    const due = document.getElementById("due").value;
    const priority = document.getElementById("prio").value;
    const tag = document.getElementById("tag").value;

    // send task to backend
    const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers:{"Content-Type": "application/json"},
        body: JSON.stringify({
            title: title,
            due: due,
            priority: priority,
            tag: tag
        })
    });

    // cgeck if task was created successfully
    if (response.ok){
        console.log("Task created");

        // clear the form and close the panel
        taskForm.reset();
        addTaskPanel.style.display = "none";

        // refresh task list
        loadTasks();
    } else {
        console.error("Failed to create task.")
    }
});


// READ TASKS ---------------------
// fetch tasks from database
async function loadTasks() {
    const response = await fetch(`${API_URL}/tasks`);

    if (!response.ok) {
        console.error("Failed to load tasks.");
        return;
    }

    const tasks = await response.json()

    renderTasks(tasks);
}

// display tasks
async function renderTasks(tasks) {
    taskList.innerHTML = "";

    if (tasks.length === 0){
        taskList.innerHTML = "<p>No tasks yet.</p>";
        return;
    }

    tasks.forEach((task) => {
        const taskCard = document.createElement("div");
        
        taskCard.classList.add("task-card");

        taskCard.innerHTML = `
            <h3>${task.title}</h3>
            <p>Due: ${task.due || "No due date"}</p>
            <p>Priority: ${task.priority || "None"}</p>
            <p>Category: ${task.category || "None"}</p>
        `;

        taskList.appendChild(taskCard);
    });
}

// INITIAL LOAD ---------------------
loadTasks();

// TODO: create func to edit a task
// async function updateTask(id, task) {}

// TODO: create func to delete a task
// async function deleteTask(id) {}

// TODO: add event listeners