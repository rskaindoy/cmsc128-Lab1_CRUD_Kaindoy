console.log("Lista app loaded!");

// store API URL
const API_URL = "http://localhost:3000/api";

// get HTML elements
const addTaskButton = document.getElementById("add-task-button");
const closeTaskPanel = document.getElementById("close-task-panel");
const addTaskPanel = document.getElementById("add-task-panel");
const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");

const undoNotif = document.getElementById("undo-notif");
const undoButton = document.getElementById("undo-button");

undoNotif.style.display = "none";

// MANIPULATE TASK PANEL ---------------------

// open the add-task panel
addTaskButton.addEventListener("click", () => {
    taskForm.reset();
    delete taskForm.dataset.editingID;

    document.getElementById("task-panel-title").textContent = "Add a Task";
    document.getElementById("task-submit-button").textContent = "Add Task";

    addTaskPanel.style.display = "block";
});

// close the add-task panel
closeTaskPanel.addEventListener("click", () => {
    addTaskPanel.style.display = "none";
});


// MANIPULATE TASK FORM ---------------------
taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // get values from the form
    const title = document.getElementById("title").value;
    const due = document.getElementById("due").value;
    const priority = document.getElementById("prio").value;
    const tag = document.getElementById("tag").value;

    const editingID = taskForm.dataset.editingID;

    let response;

    if (editingID){
        // update existing task
        response = await fetch(`${API_URL}/tasks/${editingID}`,{
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                title: title,
                due: due,
                priority: priority,
                tag: tag
            })
        });
    } else {
        // create new task
        response = await fetch(`${API_URL}/tasks`, {
            method: "POST",
            headers:{"Content-Type": "application/json"},
            body: JSON.stringify({
                title: title,
                due: due,
                priority: priority,
                tag: tag
            })
        });
    }

    // check if task was updated or created successfully
    if (response.ok){
        console.log(editingID ? "Task updated" : "Task created");

        // clear the form and close the panel
        taskForm.reset();
        delete taskForm.dataset.editingID;      // makes editingID undefined, which is also default

        addTaskPanel.style.display = "none";

        // refresh task list
        loadTasks();
    } else {
        console.error("Failed to save task.")
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

// DISPLAY TASKS ---------------------
function renderTasks(tasks) {
    taskList.innerHTML = "";

    if (tasks.length === 0){
        taskList.innerHTML = "<p>No tasks yet.</p>";
        return;
    }

    tasks.forEach((task) => {
        const taskCard = document.createElement("div");
        
        taskCard.classList.add("task-card");

        taskCard.innerHTML = `
            <label>
                <input type="checkbox" class="done-task-checkbox" data-id="${task.task_id}" ${task.is_done ? "checked" : ""}>
                ${task.title}
            </label>

            <p>Due: ${task.due || "No due date"}</p>
            <p>Priority: ${task.priority || "None"}</p>
            <p>Category: ${task.tag || "None"}</p>

            <button class="edit-task-button" data-id="${task.task_id}">Edit</button>
            <button class="delete-task-button" data-id="${task.task_id}">Delete</button>
        `;

        taskList.appendChild(taskCard);
    });

    // add event listener to 'EDIT' buttons
    const editButtons = document.querySelectorAll(".edit-task-button");

    editButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const taskID = button.dataset.id;

            openEditTaskPanel(taskID, tasks);
        });
    });

    // add event listener to 'DELETE' buttons
    const deleteButtons = document.querySelectorAll(".delete-task-button");

    deleteButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            const taskID = button.dataset.id;

            await deleteTask(taskID);
        });
    });

    // add event listener to MARK checkboxes
    const doneCheckboxes = document.querySelectorAll(".done-task-checkbox");

    doneCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", async () => {
            const taskID = checkbox.dataset.id;
            const isDone = checkbox.checked;

            await doneTask(taskID, isDone);
        });
    });
}

// EDIT TASK ---------------------
function openEditTaskPanel(taskID, tasks) {
    const task = tasks.find((task) => task.task_id == taskID);

    if (!task){
        return;
    }

    document.getElementById("task-panel-title").textContent = "Edit Task";
    document.getElementById("task-submit-button").textContent = "Save Changes";

    document.getElementById("title").value = task.title;
    document.getElementById("due").value = task.due || "";
    document.getElementById("prio").value = task.priority || "Medium";
    document.getElementById("tag").value = task.tag || "Others";

    addTaskPanel.style.display = "block";

    taskForm.dataset.editingID = taskID;
}

// DELETE TASK ---------------------
async function deleteTask(taskID) {
    const response = await fetch(`${API_URL}/tasks/${taskID}`,{
        method: "DELETE"
    }); 

    if (!response.ok){
        console.error("Failed to delete task.");
        return;
    }

    console.log("Task deleted");

    // refresh task list
    loadTasks();

    showUndoNotif(taskID);
}

// UNDO DELETE ---------------------
let deletedTaskID = null;
let undoTimeout = null;

function showUndoNotif(taskID){
    deletedTaskID = taskID;

    undoNotif.style.display = "flex";

    clearTimeout(undoTimeout);

    undoTimeout = setTimeout(() => {
        undoNotif.style.display = "none";
        deletedTaskID = null;
    }, 5000);
}

async function restoreTask(taskID){
    const response = await fetch(`${API_URL}/tasks/${taskID}/restore`,{
        method: "PUT"
    }); 

    if (!response.ok){
        console.error("Failed to restore task.");
        return;
    }

    console.log("Task restored");

    clearTimeout(undoTimeout);

    undoNotif.style.display = "none";
    deletedTaskID = null;

    // refresh task list
    loadTasks();
}

undoButton.addEventListener("click", async() => {
    if (!deletedTaskID){
        return;
    }

    await restoreTask(deletedTaskID);
})

async function doneTask(taskID, isDone) {
    const response = await fetch(`${API_URL}/tasks/${taskID}/done`,{
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({is_done: isDone})
    }); 

    if (!response.ok){
        console.error("Failed to update task status.");
        return;
    }

    console.log(isDone ? "Task marked as done" : "Task marked as undone");

    // refresh task list
    loadTasks();
}


// INITIAL LOAD ---------------------
loadTasks();