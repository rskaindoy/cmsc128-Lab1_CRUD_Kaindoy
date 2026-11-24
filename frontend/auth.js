// store API URL
// const API_URL = "http://127.0.0.1:3000/api";
const API_URL = "https://usad-j5vo.onrender.com/";

const authSection = document.getElementById("auth-section");

const loginFormContainer = document.getElementById("login-form-container");
const regFormContainer = document.getElementById("reg-form-container");

const loginForm = document.getElementById("login-form");
const regForm = document.getElementById("reg-form");


const loginMessage = document.getElementById("login-message");
const regMessage = document.getElementById("reg-message");

const showRegButton = document.getElementById("show-reg-button");
const showLoginButton = document.getElementById("show-login-button");

// HELPERS

function setMessage(element, text, type="error") {
    element.textContent = text;
    element.classList.toggle("error", text !== "" && type === "error");
    element.classList.toggle("success", text !== "" && type === "success");
}

// disables the submit button while waiting for the server
function setLoading(form, isLoading, busyText) {
    const button = form.querySelector('button[type="submit"]');

    if (!button){
        return;
    } 

    // remember the original label once, never overwrite it
    if (!button.dataset.label) {
        button.dataset.label = button.textContent.trim();
    }

    button.textContent = isLoading ? busyText : button.dataset.label;
    button.disabled = isLoading;
}

function friendlyError(error) {
    if (error.name === "TimeoutError") {
        return "The server took too long to respond. Please try again."
    }

    // fetch() throws a TypeError when the server can't be reached
    if (error instanceof TypeError) {
        return "Can't reach the server. Please try again in a moment.";
    }

    return error.message;
}

// fetch() for routes that need a login. Sends the session cookie, and if the server says we're not logged in anymore (401), sends the user back to login screen.
async function apiFetch(path, options = {}) {
    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            credentials: "include",
            ...options
        });
    } catch (error) {
        // server unreachable or timed out: return a failed response so every
        // caller's `!response.ok` branch runs instead of an unhandled exception
        return new Response(JSON.stringify({ error: friendlyError(error) }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
        });
    }

    if (response.status === 401) {
        setMessage(loginMessage, "Your session has expired. Please log in again.");
        showLogin();
    }

    return response;
}

// FIELD VALIDATION (replaces the browser's pop-ups)
function friendlyValidity(input) {
    const label = (input.closest(".field")?.querySelector("label")?.textContent || "this field").trim().toLowerCase();
    const v = input.validity;

    if (v.valueMissing) return input.dataset.missing || `Enter your ${label}.`;

    if (input.minLength > 0 && input.value.length < input.minLength) {
        return `Add ${input.minLength - input.value.length} more character${input.minLength - input.value.length === 1 ? "" : "s"} (at least ${input.minLength} needed).`;
    }

    if (v.patternMismatch) return input.title || "Check the format and try again.";
    if (v.tooLong) return `Keep this under ${input.maxLength} characters.`;
    if (!v.valid) return input.validationMessage;

    return "";
}

function setFieldError(input, message) {
    const anchor = input.closest(".pw-wrap, .inline-field") || input;
    let note = anchor.parentElement.querySelector(":scope > .field-error");

    if (!message) {
        note?.remove();
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
        return;
    }

    if (!note) {
        note = document.createElement("p");
        note.className = "field-error";
        note.id = `err-${input.id}`;
        note.setAttribute("role", "status");
        anchor.after(note);
    }

    note.textContent = message;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", note.id);
}

function clearFieldErrors(form) {
    form.querySelectorAll("input, select").forEach((input) => setFieldError(input, ""));
}

// returns true if everything is fine; otherwise shows notes and focuses the first problem
function validateForm(form) {
    let firstProblem = null;

    form.querySelectorAll("input[id], select[id]").forEach((input) => {
        const message = friendlyValidity(input);
        setFieldError(input, message);

        if (message && !firstProblem) {
            firstProblem = input;
        }
    });

    firstProblem?.focus();
    return !firstProblem;
}

// once a note is showing, keep it in sync as the user types (it updates, then disappears)
document.addEventListener("input", (event) => {
    if (event.target.getAttribute?.("aria-invalid")) {
        setFieldError(event.target, friendlyValidity(event.target));
    }
});

// SHOW / HIDE PW
document.addEventListener("click", (event) => {
    const toggle = event.target.closest(".pw-toggle");

    if (!toggle) {
        return;
    }

    const input = document.getElementById(toggle.dataset.target);
    const show = input.type === "password";

    input.type = show ? "text" : "password";
    toggle.textContent = show ? "Hide" : "Show";
    toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

// SWITCH LOGIN / REGISTER
showRegButton.addEventListener("click", () => {
    loginFormContainer.hidden = true;
    regFormContainer.hidden = false;

    setMessage(loginMessage, "");
    document.getElementById("reg-username").focus();
});

showLoginButton.addEventListener("click", () => {
    loginFormContainer.hidden = false;
    regFormContainer.hidden = true;

    setMessage(regMessage, "");
    document.getElementById("login-username").focus();
});

// LOGIN
loginForm.addEventListener("submit", async(event) => {
    event.preventDefault();
    if (!validateForm(loginForm)) return;   

    const username = document.getElementById("login-username").value;
    const pw = document.getElementById("login-pw").value;

    setMessage(loginMessage, "");
    setLoading(loginForm, true, "Logging in...");
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            credentials: "include",
            signal: AbortSignal.timeout(10000), // give up after 10 seconds
            body: JSON.stringify({ 
                username, 
                pw })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        loginForm.reset();
        await checkSession();
    } catch (error){
        setMessage(loginMessage, friendlyError(error));
    } finally {
        setLoading(loginForm, false);
    }
});

// REGISTER
regForm.addEventListener("submit", async(event) => {
    event.preventDefault();
    if (!validateForm(regForm)) return;  

    const username = document.getElementById("reg-username").value;
    const display_name = document.getElementById("reg-display-name").value;
    const pw = document.getElementById("reg-pw").value;

    setMessage(regMessage, "");
    setLoading(regForm, true, "Creating account...");

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            credentials: "include",
            signal: AbortSignal.timeout(10000), // give up after 10 seconds
            body: JSON.stringify({ 
                username, 
                display_name,
                pw
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        // the server alr logged the new user in, so go straight to the app
        regForm.reset();
        await checkSession();
    } catch (error){
        setMessage(regMessage, friendlyError(error));
    } finally {
        setLoading(regForm, false);
    }
});

// CHECK SESSION
async function checkSession() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            credentials: "include"
        });

        if (!response.ok) {
            showLogin();
            return;
        }

        const data = await response.json();
        showAuthenticated(data.user);
    } catch (error) {
        showLogin();
    }
}

// AUTH UI
function showLogin() {
    authSection.hidden = false;
    document.querySelector("main").hidden = true;

    // always come back to the login card, not the register one
    loginFormContainer.hidden = false;
    regFormContainer.hidden = true;
}

async function showAuthenticated(user) {
    authSection.hidden = true;
    document.querySelector("main").hidden = false;

    console.log("Logged in as:", user.display_name);
}


// initial session check
checkSession();