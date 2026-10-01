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

// SWITCH LOGIN / REGISTER

showRegButton.addEventListener("click", () => {
    loginFormContainer.hidden = true;
    regFormContainer.hidden = false;

    loginMessage.textContent = "";
});

showLoginButton.addEventListener("click", () => {
    loginFormContainer.hidden = false;
    regFormContainer.hidden = true;

    regMessage.textContent = "";
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
            body: JSON.stringify({ 
                username, 
                pw })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        loginMessage.textContent = "Login successful!";

        checkSession();
    } catch (error){
        loginMessage.textContent = error.message;
    }
});

// REGISTER
regForm.addEventListener("submit", async(event) => {
    event.preventDefault();

    const username = document.getElementById("reg-username").value;
    const display_name = document.getElementById("reg-display-name").value;
    const pw = document.getElementById("reg-pw").value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            credentials: "include",
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

        regMessage.textContent = "Account created. You can now log in.";
        
        regForm.reset();

        checkSession();
    } catch (error){
        regMessage.textContent = error.message;
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
}

function showAuthenticated(user) {
    authSection.hidden = true;
    document.querySelector("main").hidden = false;

    console.log("Logged in as:", user.display_name);
}


// initial session check
checkSession();