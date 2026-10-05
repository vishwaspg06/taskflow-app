require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;
const pool = new Pool({
  connectionTimeoutMillis: 5000,
  query_timeout: 5000,
});

pool.on("error", (error) => {
  console.error("Database pool error:", error.message);
});

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "taskflow-api" });
});

app.get("/ready", async (req, res) => {
  try {
    await pool.query("SELECT id FROM tasks LIMIT 1");
    res.json({ status: "ready", database: "connected" });
  } catch (error) {
    console.error("Readiness check failed:", error.message);
    res.status(503).json({ status: "not ready", database: "unavailable" });
  }
});
app.get("/api/tasks", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Could not load tasks" });
  }
});

app.post("/api/tasks", async (req, res) => {
  const title = req.body?.title;

  if (typeof title !== "string" ||
      !title.trim() || title.trim().length > 200) {
    return res.status(400).json({
      error: "Title must contain 1–200 characters"
    });
  }

  try {
    const result = await pool.query(
      "INSERT INTO tasks (title) VALUES ($1) RETURNING *",
      [title.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Could not add task" });
  }
});

app.patch("/api/tasks/:id", async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id) ||
      Number(req.params.id) > 2147483647 ||
      typeof req.body?.completed !== "boolean") {
    return res.status(400).json({
      error: "A valid task ID and boolean completed value are required"
    });
  }

  try {
    const result = await pool.query(
      "UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *",
      [req.body.completed, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Could not update task" });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id) ||
      Number(req.params.id) > 2147483647) {
    return res.status(400).json({ error: "Invalid task ID" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Could not delete task" });
  }
});
app.listen(port, "0.0.0.0", () => {
  console.log(`TaskFlow API running on port ${port}`);
});
