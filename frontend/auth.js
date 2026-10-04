// store API URL
const API_URL = "http://127.0.0.1:3000/api";

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

    const username = document.getElementById("login-username").value;
    const pw = document.getElementById("login-pw").value;

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