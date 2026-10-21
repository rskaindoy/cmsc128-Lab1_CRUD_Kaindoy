console.log("Lista app loaded!");

// get HTML elements
const addTaskButton = document.getElementById("add-task-button");
const closeTaskPanel = document.getElementById("close-task-panel");
const addTaskPanel = document.getElementById("add-task-panel");
const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");

// for delete confirmation notif
const deleteConfirmation = document.getElementById("delete-confirmation");
const deleteMsg = document.getElementById("delete-message");
const cancelDeleteButton = document.getElementById("cancel-delete-button");
const confirmDeleteButton = document.getElementById("confirm-delete-button");

deleteConfirmation.style.display = "none";

let pendingConfirm = null;      // what to run if user confirms

// for undo notif
const undoNotif = document.getElementById("undo-notif");
const undoButton = document.getElementById("undo-button");

undoNotif.style.display = "none";

// for filters
const statusFilter = document.getElementById("status-filter");
const categoryFilter = document.getElementById("category-filter");
const priorityFilter = document.getElementById("priority-filter");

let currentStatus = "all";
let currentCategory = "all";
let currentPriority = "all";

// for sorting
const sortSelect = document.getElementById("sort-select");
let currentSort = "created_at";

// for lists
let lists = [];
let currentListId = null;
let currentUserId = null;       // set by nav.js after login

function currentList() {
    return lists.find((list) => list.list_id === currentListId);
}

async function loadLists() {
    const response = await apiFetch("/lists");

    if (!response.ok) {
        console.error("Failed to load lists.")
        return;
    }

    lists = await response.json();

    // default to the first list (personal comes first), also resets after switching accounts
    if (!currentList()) {
        currentListId = lists[0]?.list_id ?? null;
    }
}

const personalListNav = document.getElementById("personal-list-nav");
const sharedListNav = document.getElementById("shared-list-nav");
const listSelect = document.getElementById("list-select");
const taskTitle = document.getElementById("task-title");
const newListButton = document.getElementById("new-list-button");
const newListForm = document.getElementById("new-list-form");
const newListName = document.getElementById("new-list-name");
const listMessage = document.getElementById("list-message");

function listNavItem(list) {
    const isActive = activeView === "tasks" && list.list_id === currentListId;

    return `
        <button class="nav-item list-item" type="button" data-list-id="${list.list_id}" ${isActive ? 'aria-current="page"' : ""}>
            <span aria-hidden="true">${list.type === "personal" ? "📋" : "👥"}</span>
            <span class="list-name">${escapeHTML(list.name)}</span>
            ${ list.type === "collab" ? `<span class="nav-count">${list.member_count}</span>` : ""}
        </button>
    `;
}

function renderListNav() {
    const personal = lists.filter((list) => list.type === "personal");
    const shared = lists.filter((list) => list.type === "collab");

    personalListNav.innerHTML = personal.map(listNavItem).join("");
    sharedListNav.innerHTML = shared.length ? shared.map(listNavItem).join("") : `<p class="nav-empty">No shared lists yet.</p>`;

    // for small-screen picker
    listSelect.innerHTML = lists.map((list) => {
        const label = list.type === "personal" ? `${list.name} (Personal)` : list.name;

        return `<option value="${list.list_id}">${escapeHTML(label)}</option>`;
    }).join("");

    if (currentListId) {
        listSelect.value = currentListId;
    }

    const list = currentList();
    taskTitle.textContent = list ? list.name : "My Tasks";
}

function selectList(listId) {
    currentListId = Number(listId);

    if (activeView !== "tasks") {
        showView("tasks");          // from nav.js; reload lists and tasks
    } else {
        renderListNav();
        loadTasks();
    }
}

document.getElementById("nav-list").addEventListener("click", (event) => {
    const item = event.target.closest(".list-item");

    if (item) {
        selectList(item.dataset.listId);
    }
});

listSelect.addEventListener("change", () => selectList(listSelect.value));


// NEW LIST
newListButton.addEventListener("click", () => {
    newListButton.hidden = true;
    newListForm.hidden = false;
    setMessage(listMessage, "");
    newListName.focus();
});

function closeNewListForm() {
    newListForm.reset();
    newListForm.hidden = true;
    newListButton.hidden = false;
    setMessage(listMessage, "");
};

document.getElementById("cancel-new-list").addEventListener("click", closeNewListForm);

newListForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(listMessage, "");

    const response = await apiFetch("/lists", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name: newListName.value })
    });

    const data = await response.json();

    if (!response.ok) {
        setMessage(listMessage, data.error);        // stays red and inline
        return;
    }

    closeNewListForm();
    selectList(data.list_id);
});

// MANIPULATE TASK PANEL ---------------------

// open the add-task panel
addTaskButton.addEventListener("click", () => {
    taskForm.reset();
    delete taskForm.dataset.editingID;

    document.getElementById("task-panel-title").textContent = "Add a Task";
    document.getElementById("task-submit-button").textContent = "Add Task";

    addTaskPanel.classList.add("open");
});

// close the add-task panel
closeTaskPanel.addEventListener("click", () => {
    addTaskPanel.classList.remove("open");
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
        response = await apiFetch(`/tasks/${editingID}`,{
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
        response = await apiFetch(`/lists/${currentListId}/tasks`, {
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

        addTaskPanel.classList.remove("open");

        // refresh task list
        loadTasks();
    } else {
        console.error("Failed to save task.")
    }
});


// READ TASKS ---------------------
// fetch tasks from database
async function loadTasks() {
    if (!currentListId) {
        return;
    }

    const response = await apiFetch(`/lists/${currentListId}/tasks`);

    if (!response.ok) {
        console.error("Failed to load tasks.");
        return;
    }

    const tasks = await response.json()
    const filteredTasks = filterTasks(tasks);
    const sortedTasks = sortTasks(filteredTasks);

    renderTasks(sortedTasks);
}

// FILTER TASKS TO RENDER
function filterTasks(tasks){
    return tasks.filter((task) => {
        // check status
        if (currentStatus === "active" && task.is_done) {
            return false;
        }

        if (currentStatus === "done" && !task.is_done) {
            return false;
        }

        // check category
        if (currentCategory !== "all" && task.tag !== currentCategory){
            return false;
        }

        // check priority
        if (currentPriority !== "all" && task.priority !== currentPriority){
            return false;
        }

        return true;
    });
}

statusFilter.addEventListener("change", () => {
    currentStatus = statusFilter.value;
    loadTasks();
});

categoryFilter.addEventListener("change", () => {
    currentCategory = categoryFilter.value;
    loadTasks();
});

priorityFilter.addEventListener("change", () => {
    currentPriority = priorityFilter.value;
    loadTasks();
});

// SORTING TASKS
function sortTasks(tasks){
    return [...tasks].sort((a, b) => {
        if (currentSort === "created_at"){
            return new Date(a.created_at) - new Date(b.created_at);
        }

        // makes sure tasks with no due date go to the bottom
        if (currentSort === "due"){
            if (!a.due && !b.due) return 0;
            if (!a.due) return 1;
            if (!b.due) return -1;

            return new Date(a.due) - new Date(b.due);
        }

        if (currentSort === "priority"){
            const order = {
                High: 1,
                Medium: 2,
                Low: 3
            };

            return order[a.priority] - order[b.priority];
        }

        if (currentSort === "tag"){
            return a.tag.localeCompare(b.tag);
        }

        return 0;
    })
}

sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;
    loadTasks();
});

// FORMAT DATE
function formatDueDate(due) {
    if (!due) {
        return "No due date";
    }

    const date = new Date(due);

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

// ESCAPE TEXT --------------------- to safely display special chaarcters like < and > into HTML entities 
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
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

        // checks if done
        if (task.is_done) {
            taskCard.classList.add("done");
        }

        taskCard.innerHTML = `
            <div class="task-main">
                <input type="checkbox" class="done-task-checkbox" data-id="${task.task_id}" ${task.is_done ? "checked" : ""}>
                <h3>${escapeHTML(task.title)}</h3>
            </div>

            <div class="task-details">
                <p>Due: ${formatDueDate(task.due)}</p>
                
                ${ task.due && new Date(task.due) < new Date() && !task.is_done
                    ? `<span class="overdue-badge">Overdue</span>`
                    : ""
                }

                ${ task.priority
                    ? `<span class="priority-badge ${escapeHTML(task.priority.toLowerCase())}">${escapeHTML(task.priority)}</span>`
                    : ""
                }

                ${ task.tag
                    ? `<span class="category-badge">${escapeHTML(task.tag)}</span>`
                    : ""
                }
            </div>

            <div class="task-actions">
                <button class="edit-task-button" data-id="${task.task_id}">✎ Edit</button>
                <button class="delete-task-button" data-id="${task.task_id}">🗑 Delete</button>
            </div>
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

            const task = tasks.find((task) => task.task_id == taskID);

            if (!task) {
                return;
            }

            // won't delete yet, will only show the confirmation
            askConfirm(`Are you sure you want to delete "${task.title}"?`, "Delete", () => deleteTask(taskID));
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

// CONFIRMATION NOTIF (shared by deleting tasks, leaving lists, deleting lists) ---------------------
function askConfirm(message, confirmLabel, onConfirm) {
    deleteMsg.textContent = message;
    confirmDeleteButton.textContent = confirmLabel;
    pendingConfirm = onConfirm;
    deleteConfirmation.style.display = "block";
}

cancelDeleteButton.addEventListener("click", () => {
    pendingConfirm = null;
    deleteConfirmation.style.display = "none";
});

confirmDeleteButton.addEventListener("click", async () => {
    const action = pendingConfirm;

    pendingConfirm = null;
    deleteConfirmation.style.display = "none";

    if (action) {
        await action();
    }
});

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

    addTaskPanel.classList.add("open");

    taskForm.dataset.editingID = taskID;
}

// DELETE TASK ---------------------
async function deleteTask(taskID) {
    const response = await apiFetch(`/tasks/${taskID}`,{
        method: "DELETE",
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
    const response = await apiFetch(`/tasks/${taskID}/restore`,{
        method: "PUT",
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
    const response = await apiFetch(`/tasks/${taskID}/done`,{
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