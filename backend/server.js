const express = require("express");
const cors = require("cors");

const db = require("./database");

const app = express();
const PORT = 3000;

// middleware
app.use(cors());
app.use(express.json());

// TODO: Add API routes here
/** Example:
 * GET      /api/tasks
 * POST     /api/tasks
 * PUT      /api/tasks/:id
 * DELETE   /api/tasks/:id
 */

// test route
app.get("/", (req, res) => {
    res.send("Lista API is running!");
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});