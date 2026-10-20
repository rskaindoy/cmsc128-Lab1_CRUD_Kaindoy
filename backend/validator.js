// rules for input shared by register, profile update, and change password
// each validate...() returns an error message for bad input; null (no error) for valid input

const UN_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const DISPLAY_NAME_MAX = 50;
const PW_MIN = 8;
const PW_MAX_BYTES = 72;        // bcrypt ignores everything after 72 bytes

// trims strings; anything else (ex. undefined, number, object) becomes ""
function asString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function validateUsername(username) {
    if (!UN_PATTERN.test(username)) {
        return "Username must be 3-20 characters: a combination of letters, numbers, and underscores only.";
    }

    return null;
}

function validateDisplayName(displayName) {
    if (displayName.length > DISPLAY_NAME_MAX) {
        return `Display name must be ${DISPLAY_NAME_MAX} characters or fewer`;
    }

    return null;
}

function validatePassword(pw, label = "Password") {
    if (pw.length < PW_MIN) {
        return `${label} must be at least ${PW_MIN} characters`;
    }

    // bcrypt counts bytes, not characters (emoji and accented letters take more than one)
    if (Buffer.byteLength(pw, "utf8") > PW_MAX_BYTES) {
        return `${label} is too long (${PW_MAX_BYTES} characters max; emoji = 4 characters, accented letters = 2 bytes.`;
    }

    return null;
}

module.exports = { asString, validateUsername, validateDisplayName, validatePassword };