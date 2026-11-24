// connects to Turso (hosted libSQL/SQLite). Credentials come from environment variables
const { createClient } = require("@libsql/client");

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN. See backend/.env.example.");
    process.exit(1);
}

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

// plain objects instead of libSQL Row objects, so res.json() behaves exactly as they did with better-sqlite3
const toPlain = (rows) => rows.map((row) => ({ ...row }));

// keeps the db.prepare(sql).get/all/run(...args) shape server.js already uses,
// but every call now returns a Promise, so server.js must `await` it
const db = {
    prepare(sql) {
        const execute = (args) => client.execute({ sql, args });

        return {
            get: async (...args) => toPlain((await execute(args)).rows)[0],
            all: async (...args) => toPlain((await execute(args)).rows),
            run: async (...args) => {
                const result = await execute(args);

                return {
                    changes: result.rowsAffected,
                    lastInsertRowid: Number(result.lastInsertRowid)   // BigInt -> Number
                };
            }
        };
    },

    // several statements in ONE transaction: all succeed or none do. Each item is { sql, args }
    batch: (statements) => client.batch(statements, "write"),

    // replaces the old err.code === "SQLITE_CONSTRAINT_UNIQUE" / "..._PRIMARYKEY" checks
    isUniqueViolation: (err) => /UNIQUE|PRIMARY KEY/i.test(err?.message ?? "")
};

module.exports = db;