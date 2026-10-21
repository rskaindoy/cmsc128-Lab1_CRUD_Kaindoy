// run with:  npm test   (uses Node's built-in test runner, nothing to install)
const test = require("node:test");
const assert = require("node:assert/strict");

const { asString, validateUsername, validateDisplayName, validatePassword } = require("./validator");

test("asString trims strings and turns non-strings into empty text", () => {
    assert.equal(asString("  sei  "), "sei");
    assert.equal(asString(undefined), "");
    assert.equal(asString(123), "");
    assert.equal(asString({ a: 1 }), "");
});

test("validateUsername accepts 3-20 letters, numbers and underscores only", () => {
    assert.equal(validateUsername("sei_01"), null);
    assert.equal(validateUsername("abc"), null);
    assert.equal(validateUsername("a".repeat(20)), null);

    assert.ok(validateUsername("ab"));
    assert.ok(validateUsername("a".repeat(21)));
    assert.ok(validateUsername("has space"));
    assert.ok(validateUsername("<script>"));
    assert.ok(validateUsername(""));
});

test("validateDisplayName allows up to 50 characters", () => {
    assert.equal(validateDisplayName("Sei"), null);
    assert.equal(validateDisplayName("a".repeat(50)), null);
    assert.ok(validateDisplayName("a".repeat(51)));
});

test("validatePassword enforces 8 characters minimum", () => {
    assert.equal(validatePassword("12345678"), null);
    assert.equal(validatePassword("1234567"), "Password must be at least 8 characters");
    assert.equal(validatePassword("1234567", "New password"), "New password must be at least 8 characters");
});

test("validatePassword enforces bcrypt's 72-byte limit, counting bytes not characters", () => {
    assert.equal(validatePassword("a".repeat(72)), null);
    assert.ok(validatePassword("a".repeat(73)));

    // 40 emoji = 40 characters... but 160 bytes in UTF-8, so bcrypt would silently cut it off
    assert.ok(validatePassword("😀".repeat(40)));
    // 18 emoji = 72 bytes exactly
    assert.equal(validatePassword("😀".repeat(18)), null);
});
