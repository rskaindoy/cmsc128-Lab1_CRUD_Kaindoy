// for sidebar nav, profile, logout and possibly trash
// loaded after auth.js and app.js, wraps their functions instead of editing them

const sidebarGreeting = document.getElementById("sidebar-greeting");
const navItems = document.querySelectorAll(".nav-item[data-view]");
const logoutButton = document.getElementById("logout-button");

const views = {
    tasks: document.getElementById("task-section"),
    profile: document.getElementById("profile-section"),
};


// VIEW SWITCHING
function showView(name) {
    Object.entries(views).forEach(([key, section]) => {
        section.hidden = key !== name;
    });

    navItems.forEach((item) => {
        if (item.dataset.view === name) {
            item.setAttribute("aria-current", "page");
        } else {
            item.removeAttribute("aria-current");
        }
    });

    addTaskPanel.classList.remove("open"); // from app.js

    if (name === "profile") {
        loadProfile();
    }

    window.scrollTo(0,0);
}

navItems.forEach((item) => {
    item.addEventListener("click", () => showView(item.dataset.view));
});

// HOOK INTO AUTH
const baseShowAuthenticated = showAuthenticated;
const baseShowLogin = showLogin;

showAuthenticated = function (user) {
    baseShowAuthenticated(user);
    document.body.classList.add("logged-in");
    sidebarGreeting.textContent = `Hello, ${user.display_name}!`;
    showView("tasks");
};

showLogin = function () {
    baseShowLogin();
    document.body.classList.remove("logged-in");
};

// LOGOUT
logoutButton.addEventListener("click", async() => {
    try {
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Logout failed");
        }

        loginMessage.textContent = "";
        showLogin();
    } catch (error) {
        alert("Couldn't log out. Please try again.");
    }
});

// PROFILE
const profileUsername = document.getElementById("profile-username");
const profileDisplayName = document.getElementById("profile-display-name");
const profileCreated = document.getElementById("profile-created");
const profileAvatar = document.getElementById("profile-avatar");
const profileHeroName = document.getElementById("profile-hero-name");
const profileMessage = document.getElementById("profile-message");
const editUsernameButton = document.getElementById("edit-username-button");
const editDisplayNameButton = document.getElementById("edit-display-name-button");

let profileMessageTimeout;

// "2026-10-01 13:36:22" -> "Oct 1, 2026"
function formatCreated(createdAt) {
    const date = new Date(createdAt.replace(" ", "T") + "Z");   // SQLite stpres UTC
    if (isNaN(date)) {
        return createdAt;
    }
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function setProfileMessage (text, isError = false) {
    profileMessage.textContent = text;
    profileMessage.classList.toggle("error", isError && text !== "");
    profileMessage.classList.toggle("success", !isError && text !== "");

    clearTimeout(profileMessageTimeout);

    if (text && !isError) {
        profileMessageTimeout = setTimeout(() => setProfileMessage(""), 3000);
    }
}

async function loadProfile() {
    setProfileMessage("");

    try {
        const response = await fetch(`${API_URL}/profile`, { credentials: "include" });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        const user = data.user;
        profileUsername.textContent = user.username;
        profileDisplayName.textContent = user.display_name;
        profileHeroName.textContent = user.display_name;
        profileAvatar.textContent = user.display_name.charAt(0).toUpperCase();
        profileCreated.textContent = formatCreated(user.created_at);

        editUsernameButton.hidden = false;
        editDisplayNameButton.hidden = false;
    } catch (error) {
        setProfileMessage(error.message, true);
    }
}

function editProfileField(field) {
    const isUsername = field === "username";
    const profileElement = isUsername ? profileUsername : profileDisplayName;
    const editButton = isUsername ? editUsernameButton : editDisplayNameButton;
    const label = isUsername ? "Username" : "Display Name";
    const currentValue = profileElement.textContent;

    const input = document.createElement("input");
    input.type = "text";
    input.value = currentValue;
    input.setAttribute("aria-label", label);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "save-button";
    saveButton.textContent = "Save";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "link-button muted";
    cancelButton.textContent = "Cancel";

    profileElement.replaceChildren(input, saveButton, cancelButton);
    editButton.hidden = true;
    setProfileMessage("");
    input.focus();
    input.select();

    function cancel() {
        profileElement.textContent = currentValue;
        editButton.hidden = false;
        setProfileMessage("");
    }

    async function save() {
        const newValue = input.value.trim();

        if (!newValue) {
            setProfileMessage(`Enter a ${label.toLowerCase()}.`, true);
            input.focus();
            return;
        }

        if (newValue === currentValue) {
            cancel();
            return;
        }

        const username = isUsername ? newValue : profileUsername.textContent;
        const display_name = isUsername ? profileDisplayName.textContent : newValue;

        try {
            const response = await fetch(`${API_URL}/profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    username,
                    display_name
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            await loadProfile();    // refreshes the rows, then show the success message
            setProfileMessage(data.message || `${label} updated`);
            sidebarGreeting.textContent = `Hello, ${display_name}!`;
        } catch (error) {
            // stay in edit mode so the user can fix it
            setProfileMessage(error.message, true);
            input.focus();
        }
    }

    saveButton.addEventListener("click", save);
    cancelButton.addEventListener("click", cancel);

    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") save();
        if (event.key === "Escape") cancel();
    });
}

editUsernameButton.addEventListener("click", () => editProfileField("username"));
editDisplayNameButton.addEventListener("click", () => editProfileField("display_name"));