console.log("USAD loaded!");

// ---------- elements ----------
const addTaskButton = document.getElementById("add-task-button");
const taskForm = document.getElementById("task-form");
const taskFormMessage = document.getElementById("task-form-message");
const taskList = document.getElementById("task-list");
const taskSheet = document.getElementById("task-sheet");
const taskSummary = document.getElementById("task-summary");
const taskTitle = document.getElementById("task-title");

// side panel (task form + members share it)
const sidePanel = document.getElementById("side-panel");
const panelTitle = document.getElementById("panel-title");
const closePanelButton = document.getElementById("close-panel");
const panelScrim = document.getElementById("panel-scrim");
const taskPanelBody = document.getElementById("task-panel-body");
const membersPanel = document.getElementById("members-panel");
let panelOpener = null;

// quick add
const quickAddForm = document.getElementById("quick-add");
const quickAddInput = document.getElementById("quick-add-input");
const quickAddMessage = document.getElementById("quick-add-message");

// confirm dialog (only for leaving/deleting a list)
const deleteConfirmation = document.getElementById("delete-confirmation");
const deleteMsg = document.getElementById("delete-message");
const cancelDeleteButton = document.getElementById("cancel-delete-button");
const confirmDeleteButton = document.getElementById("confirm-delete-button");
let pendingConfirm = null;

// toast
const toast = document.getElementById("toast");
const toastText = document.getElementById("toast-text");
const toastAction = document.getElementById("toast-action");
let toastTimeout = null;

// filters + sorting
const statusButtons = document.querySelectorAll("#status-filter button");
const categoryFilter = document.getElementById("category-filter");
const priorityFilter = document.getElementById("priority-filter");
const sortButtons = document.querySelectorAll(".sort-button");

let currentStatus = "all";
let currentCategory = "all";
let currentPriority = "all";
let currentSort = "created_at";     // "created_at" = the order tasks were added

// tasks
let allTasks = [];                  // everything on the current list
let visibleTasks = [];              // after filtering + sorting
let pendingFocusId = null;          // keeps keyboard focus on a checkbox after re-render

// lists
let lists = [];
let currentListId = null;
let currentUserId = null;           // set by nav.js after login
let activeView = null;              // set by showView() in nav.js
const personalListNav = document.getElementById("personal-list-nav");
const sharedListNav = document.getElementById("shared-list-nav");
const listSelect = document.getElementById("list-select");
const newListButton = document.getElementById("new-list-button");
const newListForm = document.getElementById("new-list-form");
const newListName = document.getElementById("new-list-name");
const listMessage = document.getElementById("list-message");

// members
const shareListButton = document.getElementById("share-list-button");
const avatarStack = document.getElementById("avatar-stack");
const memberList = document.getElementById("member-list");
const addMemberForm = document.getElementById("add-member-form");
const memberUsername = document.getElementById("member-username");
const membersMessage = document.getElementById("members-message");
const leaveListButton = document.getElementById("leave-list-button");
const deleteListButton = document.getElementById("delete-list-button");
let membersCache = { listId: null, members: [] };

// date
const datePicker = flatpickr(document.getElementById("due"), {
    enableTime: true,
    dateFormat: "Y-m-d\\TH:i",      // value sent to the server
    altInput: true,                 // what the user sees:
    altFormat: "D, M j · h:i K",
    minuteIncrement: 5,
    disableMobile: true
});

// ---------- small helpers ----------
datePicker.altInput.id = "due-display";

function setDue(value) {
    value ? datePicker.setDate(value, false) : datePicker.clear();
}

// quick picks default to 11:59 PM so "Today" isn't overdue instantly
document.querySelector(".quick-dates").addEventListener("click", (event) => {
    const kind = event.target.closest("[data-quick]")?.dataset.quick;

    if (!kind) return;
    if (kind === "none") return datePicker.clear();

    const date = new Date();
    date.setHours(23, 59, 0, 0);
    if (kind === "tomorrow") date.setDate(date.getDate() + 1);
    if (kind === "nextweek") date.setDate(date.getDate() + 7);

    datePicker.setDate(date, false);
});

function icon(name) {
    return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

// escape text so special characters like < and > show up as text, not HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

function isOverdue(task) {
    return Boolean(task.due) && !task.is_done && new Date(task.due) < new Date();
}

// "Oct 26, 12 PM" (year only if it isn't this year)
function formatDueShort(due) {
    const date = new Date(due);

    if (isNaN(date)) {
        return "";
    }

    const options = { month: "short", day: "numeric" };

    if (date.getFullYear() !== new Date().getFullYear()) {
        options.year = "numeric";
    }

    const day = date.toLocaleDateString("en-US", options);
    const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(":00", "");

    return `${day}, ${time}`;
}


// <input type="datetime-local"> only accepts "YYYY-MM-DDTHH:mm" (local time).
// If the server returns anything else ("2026-10-26 12:00:00", "...Z", "...:00.000Z"),
// the input silently stays blank and the edit sends an empty date.
function toInputValue(due) {
    if (!due) {
        return "";
    }

    const date = new Date(due);

    if (isNaN(date)) {
        return "";
    }

    const pad = (n) => String(n).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// setLoading() remembers the button's first label forever, so set it whenever the label changes
function setSubmitLabel(text) {
    const button = document.getElementById("task-submit-button");

    button.textContent = text;
    button.dataset.label = text;
}

function currentList() {
    return lists.find((list) => list.list_id === currentListId);
}

// ---------- toast (success messages + Undo) ----------
function hideToast() {
    clearTimeout(toastTimeout);
    toast.hidden = true;
    toastAction.hidden = true;
    toastAction.onclick = null;
}

function showToast(message, actionLabel = null, onAction = null, duration = 4000, type = "info") {
    clearTimeout(toastTimeout);

    toastText.textContent = message;
    toast.classList.toggle("error", type === "error");
    toast.setAttribute("role", type === "error" ? "alert" : "status");

    if (actionLabel && onAction) {
        toastAction.textContent = actionLabel;
        toastAction.hidden = false;
        toastAction.onclick = async () => {
            hideToast();
            await onAction();
        };
    } else {
        toastAction.hidden = true;
        toastAction.onclick = null;
    }

    toast.hidden = false;
    toastTimeout = setTimeout(hideToast, duration);
}

function showError(message) {
    showToast(message, null, null, 8000, "error");
}

// ---------- side panel (one pattern for secondary content) ----------
function openPanel(mode) {
    panelOpener = document.activeElement;

    const isTask = mode === "task";
    taskPanelBody.hidden = !isTask;
    membersPanel.hidden = isTask;
    sidePanel.dataset.mode = mode;

    sidePanel.inert = false;
    sidePanel.classList.add("open");
    document.body.classList.add("panel-open");

    setTimeout(() => {
        const first = isTask
            ? document.getElementById("title")
            : (addMemberForm.hidden ? closePanelButton : memberUsername);
        first.focus();
    }, 60);
}

function closeSidePanel({ restoreFocus = true } = {}) {
    if (!sidePanel.classList.contains("open")) {
        return;
    }

    sidePanel.classList.remove("open");
    sidePanel.inert = true;
    document.body.classList.remove("panel-open");

    taskForm.reset();
    datePicker.clear();
    delete taskForm.dataset.editingID;
    setMessage(taskFormMessage, "");
    addMemberForm.reset();
    setMessage(membersMessage, "");
    clearFieldErrors(taskForm);                
    clearFieldErrors(addMemberForm);           

    if (restoreFocus && panelOpener && document.contains(panelOpener)) {
        panelOpener.focus();
    }

    panelOpener = null;
}

closePanelButton.addEventListener("click", () => closeSidePanel());
panelScrim.addEventListener("click", () => closeSidePanel());

document.addEventListener("keydown", (event) => {
    if (document.querySelector(".flatpickr-calendar.open")) return;     // let Esc close the calendar first
    
    if (event.key === "Escape" && sidePanel.classList.contains("open") && !deleteConfirmation.open) {
        closeSidePanel();
    }

    // press N to jump to the quick-add note
    const el = event.target;
    const isTyping = el.matches("input, textarea, select, [contenteditable]");

    if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey && !event.altKey
        && !isTyping && activeView === "tasks" && !sidePanel.classList.contains("open") && !deleteConfirmation.open) {
        event.preventDefault();
        quickAddInput.focus();
    }
});

// ---------- lists (sidebar) ----------
async function loadLists() {
    const response = await apiFetch("/lists");

    if (!response.ok) {
        showError("We couldn't load your lists. Check your connection and refresh.");
        return;
    }

    lists = await response.json();

    // default to the first list (personal comes first), also resets after switching accounts
    if (!currentList()) {
        currentListId = lists[0]?.list_id ?? null;
    }

    renderListNav();
}

function listNavItem(list) {
    const isActive = activeView === "tasks" && list.list_id === currentListId;

    return `
        <button class="nav-item list-item" type="button" data-list-id="${list.list_id}" ${isActive ? 'aria-current="page"' : ""}>
            ${icon(list.type === "personal" ? "notebook" : "users")}
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
    shareListButton.hidden = !list || list.type === "personal";

    if (membersCache.listId !== currentListId) {
        avatarStack.innerHTML = "";
    }
}

function selectList(listId) {
    currentListId = Number(listId);
    closeSidePanel({ restoreFocus: false });

    if (activeView !== "tasks") {
        showView("tasks");          // from nav.js; reloads lists and tasks
    } else {
        setMessage(quickAddMessage, "");
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
    clearFieldErrors(newListForm); 
    newListForm.hidden = true;
    newListButton.hidden = false;
    setMessage(listMessage, "");
}

document.getElementById("cancel-new-list").addEventListener("click", closeNewListForm);

newListForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(newListForm)) return; 

    setMessage(listMessage, "");

    const name = newListName.value.trim();

    try {
        const response = await apiFetch("/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        closeNewListForm();
        await loadLists();
        selectList(data.list_id);
        showToast(`Created "${name}".`);
    } catch (error) {
        setMessage(listMessage, friendlyError(error));
    }
});

// ---------- members ----------
function avatarInitial(member) {
    return escapeHTML((member.display_name || member.username || "?").charAt(0).toUpperCase());
}

function renderAvatarStack(members) {
    const shown = members.slice(0, 3);
    const extra = members.length - shown.length;

    avatarStack.innerHTML = shown.map((member) =>
        `<span class="mini-avatar tone-${member.user_id % 4}">${avatarInitial(member)}</span>`
    ).join("") + (extra > 0 ? `<span class="mini-avatar more">+${extra}</span>` : "");

    shareListButton.setAttribute("aria-label", `Members (${members.length})`);
}

async function fetchMembers(force = false) {
    const list = currentList();

    if (!list || list.type !== "collab") {
        return [];
    }

    if (!force && membersCache.listId === list.list_id) {
        return membersCache.members;
    }

    const response = await apiFetch(`/lists/${list.list_id}/members`);

    if (!response.ok) {
        throw new Error("Couldn't load members.");
    }

    const members = await response.json();
    membersCache = { listId: list.list_id, members };

    if (list.list_id === currentListId) {
        renderAvatarStack(members);
    }

    return members;
}

async function loadMembers() {
    const list = currentList();

    if (!list) {
        return;
    }

    let members;

    try {
        members = await fetchMembers(true);
    } catch (error) {
        setMessage(membersMessage, "Couldn't load the member list. Check your connection and try again.");
        return;
    }

    const isOwner = list.role === "owner";

    memberList.innerHTML = members.map((member) => `
        <li class="member-item">
            <span class="member-name">
                ${escapeHTML(member.display_name)} <small>@${escapeHTML(member.username)}</small>
            </span>
            ${ member.role === "owner"
                ? `<span class="owner-tag">Owner</span>`
                : isOwner
                    ? `<button class="link-button muted remove-member-button" data-id="${member.user_id}" type="button">Remove</button>`
                    : ""
            }
        </li>
    `).join("");

    addMemberForm.hidden = !isOwner;
    deleteListButton.hidden = !isOwner;
    leaveListButton.hidden = isOwner;
}

shareListButton.addEventListener("click", () => {
    if (sidePanel.classList.contains("open") && sidePanel.dataset.mode === "members") {
        closeSidePanel();
        return;
    }

    panelTitle.textContent = "People on this list";
    setMessage(membersMessage, "");
    openPanel("members");
    loadMembers();
});

// ADD A MEMBER
addMemberForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(addMemberForm)) return;

    setMessage(membersMessage, "");

    try {
        const response = await apiFetch(`/lists/${currentListId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: memberUsername.value })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        addMemberForm.reset();
        setMessage(membersMessage, data.message, "success");

        await loadLists();          // refreshes the member count in the sidebar
        loadMembers();
    } catch (error) {
        setMessage(membersMessage, friendlyError(error));
    }
});

// REMOVE A MEMBER (owner only)
memberList.addEventListener("click", async (event) => {
    const button = event.target.closest(".remove-member-button");

    if (!button) {
        return;
    }

    setMessage(membersMessage, "");

    const response = await apiFetch(`/lists/${currentListId}/members/${button.dataset.id}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        const data = await response.json();
        setMessage(membersMessage, data.error);
        return;
    }

    await loadLists();
    loadMembers();
});

// after leaving or deleting, the list is gone for this user, so fall back to the personal list
async function afterLeavingList() {
    closeSidePanel({ restoreFocus: false });
    currentListId = null;
    membersCache = { listId: null, members: [] };
    await loadLists();
    loadTasks();
}

leaveListButton.addEventListener("click", () => {
    const list = currentList();

    askConfirm(`Leave "${list.name}"? You'll lose access to its tasks.`, "Leave list", async () => {
        const response = await apiFetch(`/lists/${currentListId}/members/${currentUserId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const data = await response.json();
            setMessage(membersMessage, data.error);
            return;
        }

        afterLeavingList();
    });
});

deleteListButton.addEventListener("click", () => {
    const list = currentList();

    askConfirm(`Delete "${list.name}" and all its tasks for everyone?`, "Delete list", async () => {
        const response = await apiFetch(`/lists/${currentListId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const data = await response.json();
            setMessage(membersMessage, data.error);
            return;
        }

        afterLeavingList();
    });
});

// ---------- confirm dialog ----------
function askConfirm(message, confirmLabel, onConfirm) {
    deleteMsg.textContent = message;
    confirmDeleteButton.textContent = confirmLabel;
    pendingConfirm = onConfirm;
    deleteConfirmation.showModal();
}

cancelDeleteButton.addEventListener("click", () => {
    pendingConfirm = null;
    deleteConfirmation.close();
});

deleteConfirmation.addEventListener("cancel", () => {
    pendingConfirm = null;          // Esc key
});

confirmDeleteButton.addEventListener("click", async () => {
    const action = pendingConfirm;

    pendingConfirm = null;
    deleteConfirmation.close();

    if (action) {
        await action();
    }
});

// ---------- add / edit a task (side panel) ----------
addTaskButton.addEventListener("click", () => {
    taskForm.reset();
    datePicker.clear();
    delete taskForm.dataset.editingID;
    setMessage(taskFormMessage, "");

    panelTitle.textContent = "Add a task";
    setSubmitLabel("Add task")

    openPanel("task");
});

function openEditTaskPanel(taskID) {
    const task = allTasks.find((task) => task.task_id == taskID);

    if (!task) {
        return;
    }

    setMessage(taskFormMessage, "");
    panelTitle.textContent = "Edit task";
    setSubmitLabel("Save changes");

    document.getElementById("title").value = task.title;
    setDue(toInputValue(task.due));
    document.getElementById("prio").value = task.priority || "Medium";
    document.getElementById("tag").value = task.tag || "Others";

    taskForm.dataset.editingID = taskID;
    openPanel("task");
}

taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(taskForm)) return;

    setMessage(taskFormMessage, "");

    const body = JSON.stringify({
        title: document.getElementById("title").value,
        due: document.getElementById("due").value,
        priority: document.getElementById("prio").value,
        tag: document.getElementById("tag").value
    });

    const editingID = taskForm.dataset.editingID;

    setLoading(taskForm, true, "Saving...");

    try {
        const response = editingID
            ? await apiFetch(`/tasks/${editingID}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body })
            : await apiFetch(`/lists/${currentListId}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            console.error("Save task failed:", editingID ? "PUT" : "POST", response.status, data, JSON.parse(body));
            throw new Error(data.error || "We couldn't save this task. Check the fields and try again.");
        }

        closeSidePanel();
        showToast(editingID ? "Changes saved." : "Task added.");
        loadTasks();
    } catch (error) {
        setMessage(taskFormMessage, friendlyError(error));
    } finally {
        setLoading(taskForm, false);
    }
});

// ---------- quick add (type + Enter) ----------
quickAddForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(quickAddMessage, "");

    const title = quickAddInput.value.trim();

    if (!title) {
        setMessage(quickAddMessage, "Write what you need to do, then press Enter.");
        return;
    }

    try {
        const response = await apiFetch(`/lists/${currentListId}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, due: "", priority: "Medium", tag: "Others" })
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "We couldn't add that task. Try again in a moment.");
        }

        quickAddInput.value = "";
        showToast("Task added. Click its title to set a due date or category.");
        loadTasks();                // focus stays in the input so you can keep typing
    } catch (error) {
        setMessage(quickAddMessage, friendlyError(error));
    }
});

quickAddInput.addEventListener("input", () => setMessage(quickAddMessage, ""));

// ---------- read tasks ----------
async function loadTasks() {
    if (!currentListId) {
        return;
    }

    const response = await apiFetch(`/lists/${currentListId}/tasks`);

    if (!response.ok) {
        showError("We couldn't load your lists. Check your connection and refresh.");
        return;
    }

    allTasks = await response.json();

    const list = currentList();
    taskSheet.classList.toggle("shared", list?.type === "collab");

    if (list?.type === "collab") {
        fetchMembers().catch(() => {});     // cached, only fetches when the list changes
    }

    renderSummary(allTasks);

    visibleTasks = sortTasks(filterTasks(allTasks));
    renderTasks(visibleTasks);
}

function renderSummary(tasks) {
    const active = tasks.filter((task) => !task.is_done);
    const overdue = active.filter(isOverdue).length;

    if (tasks.length === 0) {
        taskSummary.textContent = "Nothing here yet";
    } else if (active.length === 0) {
        taskSummary.textContent = "Everything's done";
    } else {
        taskSummary.textContent = `${active.length} active` + (overdue ? ` · ${overdue} overdue` : "");
    }
}

// ---------- filters ----------
function filterTasks(tasks) {
    return tasks.filter((task) => {
        if (currentStatus === "active" && task.is_done) return false;
        if (currentStatus === "done" && !task.is_done) return false;
        if (currentCategory !== "all" && task.tag !== currentCategory) return false;
        if (currentPriority !== "all" && task.priority !== currentPriority) return false;

        return true;
    });
}

function updateFilterUI() {
    statusButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.status === currentStatus));
    });

    categoryFilter.classList.toggle("is-filtering", currentCategory !== "all");
    priorityFilter.classList.toggle("is-filtering", currentPriority !== "all");
}

statusButtons.forEach((button) => {
    button.addEventListener("click", () => {
        currentStatus = button.dataset.status;
        updateFilterUI();
        loadTasks();
    });
});

categoryFilter.addEventListener("change", () => {
    currentCategory = categoryFilter.value;
    updateFilterUI();
    loadTasks();
});

priorityFilter.addEventListener("change", () => {
    currentPriority = priorityFilter.value;
    updateFilterUI();
    loadTasks();
});

function clearFilters() {
    currentStatus = "all";
    currentCategory = "all";
    currentPriority = "all";
    categoryFilter.value = "all";
    priorityFilter.value = "all";
    updateFilterUI();
    loadTasks();
}

// ---------- sorting (click a column header; click it again to go back to date added) ----------
function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
        // completed tasks go to the bottom
        if (a.is_done !== b.is_done) {
            return a.is_done ? 1 : -1;
        }

        if (currentSort === "created_at") {
            return new Date(a.created_at) - new Date(b.created_at);
        }

        // tasks with no due date go to the bottom
        if (currentSort === "due") {
            if (!a.due && !b.due) return 0;
            if (!a.due) return 1;
            if (!b.due) return -1;

            return new Date(a.due) - new Date(b.due);
        }

        if (currentSort === "priority") {
            const order = { High: 1, Medium: 2, Low: 3 };

            return order[a.priority] - order[b.priority];
        }

        if (currentSort === "tag") {
            return a.tag.localeCompare(b.tag);
        }

        return 0;
    });
}

function updateSortUI() {
    sortButtons.forEach((button) => {
        const isActive = button.dataset.sort === currentSort;

        button.classList.toggle("active", isActive);
        button.title = isActive ? "Click again to go back to the order you added them" : "Sort by this column";
        button.closest("[role='columnheader']").setAttribute("aria-sort", isActive ? "ascending" : "none");
    });
}

sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
        currentSort = currentSort === button.dataset.sort ? "created_at" : button.dataset.sort;
        updateSortUI();
        loadTasks();
    });
});

updateSortUI();

// ---------- display tasks ----------
function taskRow(task) {
    const shared = currentList()?.type === "collab";
    const late = isOverdue(task);
    const title = escapeHTML(task.title);

    const due = task.due
        ? `<span class="cell cell-due ${late ? "late" : ""}" role="cell">
                ${late ? icon("clock") : ""}
                <span>${formatDueShort(task.due)}</span>
                ${late ? `<span class="late-label">Overdue</span>` : ""}
           </span>`
        : `<span class="cell cell-due none" role="cell">No due date</span>`;

    const priority = task.priority
        ? `<span class="prio ${escapeHTML(task.priority.toLowerCase())}">${escapeHTML(task.priority)}</span>`
        : "";

    const canDelete = Boolean(task.can_delete);
    const addedBy = escapeHTML(task.added_by) + (task.is_member ? "" : ` <span class="former">(left)</span>`);

    return `
        <div class="task-row ${task.is_done ? "done" : ""}" role="row">
            <span class="cell-check" role="cell">
                <input type="checkbox" class="done-task-checkbox" data-id="${task.task_id}"
                    aria-label="Mark &quot;${title}&quot; as done" ${task.is_done ? "checked" : ""}>
            </span>

            <span class="cell cell-task" role="cell">
                <button class="task-title-button" type="button" data-action="edit" data-id="${task.task_id}" title="${title}">${title}</button>
            </span>

            ${due}

            <span class="cell cell-cat cat-${escapeHTML((task.tag || "").toLowerCase())}" role="cell">${escapeHTML(task.tag || "")}</span>
            <span class="cell cell-prio" role="cell">${priority}</span>
            ${ shared ? `<span class="cell cell-by" role="cell">${addedBy}</span>` : "" }

            <span class="cell cell-actions" role="cell">
                <button class="icon-button" type="button" data-action="edit" data-id="${task.task_id}" aria-label="Edit &quot;${title}&quot;" title="Edit">${icon("pencil")}</button>
                <button class="icon-button delete" type="button" data-action="delete" data-id="${task.task_id}"
                    aria-label="Delete &quot;${title}&quot;" ${canDelete ? "" : "disabled"}
                    title="${canDelete ? "Delete" : `Only ${escapeHTML(task.added_by)} or the list owner can delete this task`}">${icon("trash")}
                </button>
            </span>
        </div>
    `;
}

function renderTasks(tasks) {
    if (tasks.length === 0) {
        taskList.innerHTML = allTasks.length > 0
            ? `<div class="empty-state"><p>Nothing matches these filters. <button type="button" class="link-button" data-action="clear-filters">Show everything</button></p></div>`
            : `<div class="empty-state"><p>A fresh page. Write your first task in the yellow note above.</p></div>`;
        return;
    }

    taskList.innerHTML = tasks.map(taskRow).join("");

    if (pendingFocusId) {
        taskList.querySelector(`.done-task-checkbox[data-id="${pendingFocusId}"]`)?.focus();
        pendingFocusId = null;
    }
}

// one set of listeners for every row
taskList.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");

    if (!target) {
        return;
    }

    const { action, id } = target.dataset;

    if (action === "edit") {
        openEditTaskPanel(id);
    } else if (action === "delete") {
        deleteTask(id);
    } else if (action === "clear-filters") {
        clearFilters();
    }
});

taskList.addEventListener("change", async (event) => {
    if (event.target.matches(".done-task-checkbox")) {
        await doneTask(event.target.dataset.id, event.target.checked);
    }
});

// ---------- delete (no confirm; Undo toast instead) ----------
async function deleteTask(taskID) {
    const response = await apiFetch(`/tasks/${taskID}`, { method: "DELETE" });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        showError(data.error || "We couldn't delete that task. Try again in a moment.");
        return;
    }

    loadTasks();
    showToast("Task deleted.", "Undo", () => restoreTask(taskID), 6000);
}

async function restoreTask(taskID) {
    const response = await apiFetch(`/tasks/${taskID}/restore`, { method: "PUT" });

    if (!response.ok) {
        showError(data.error || "We couldn't delete that task. Try again in a moment.");
        return;
    }

    showToast("Task restored.");
    loadTasks();
}

async function doneTask(taskID, isDone) {
    const response = await apiFetch(`/tasks/${taskID}/done`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_done: isDone })
    });

    if (!response.ok) {
        showError(data.error || "We couldn't delete that task. Try again in a moment.");
        loadTasks();                // put the checkbox back to what the server has
        return;
    }

    pendingFocusId = taskID;
    loadTasks();
}