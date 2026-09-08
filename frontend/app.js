console.log("Lista app loaded!");

// store API URL
const API_URL = "http://localhost:3000/api";

// get HTML elements
const addTaskButton = document.getElementById("add-task-button");
const closeTaskPanel = document.getElementById("close-task-panel");
const addTaskPanel = document.getElementById("add-task-panel");
const taskForm = document.getElementById("task-form");

// open the add-task panel
addTaskButton.addEventListener("click", () => {
    addTaskPanel.style.display = "block";
});

// close the add-task panel
closeTaskPanel.addEventListener("click", () => {
    addTaskPanel.style.display = "none";
});

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
    } else {
        console.error("Failed to create task.")
    }
});

// TODO: create func to fetch tasks
// async function loadTasks() {}

// TODO: create func to display tasks
// async function renderTasks() {}

// TODO: create func to add a task
// async function addTask() {}

// TODO: create func to edit a task
// async function updateTask(id, task) {}

// TODO: create func to delete a task
// async function deleteTask(id) {}

// TODO: add event listeners