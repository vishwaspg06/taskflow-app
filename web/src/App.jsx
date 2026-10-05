import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:3001/api/tasks";

async function request(path = "", options = {}) {
  const response = await fetch(`${API}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    request()
      .then(setTasks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function mutate(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addTask(event) {
    event.preventDefault();
    if (!title.trim()) return;

    await mutate(async () => {
      const task = await request("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      setTasks((current) => [task, ...current]);
      setTitle("");
    });
  }

  async function toggleTask(task) {
    await mutate(async () => {
      const updated = await request(`/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });
      setTasks((current) =>
        current.map((item) => item.id === updated.id ? updated : item)
      );
    });
  }

  async function deleteTask(id) {
    await mutate(async () => {
      await request(`/${id}`, { method: "DELETE" });
      setTasks((current) => current.filter((task) => task.id !== id));
    });
  }

  return (
    <main className="container">
      <header>
        <p className="label">DEVOPS PRACTICE PROJECT</p>
        <h1>TaskFlow</h1>
        <p>Plan your work. Track your progress.</p>
      </header>

      <form onSubmit={addTask}>
        <input
          aria-label="New task"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Enter a task"
          maxLength={200}
          required
          disabled={loading || busy}
        />
        <button disabled={loading || busy} type="submit">Add task</button>
      </form>

      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      {loading ? <p>Loading tasks...</p> : (
        <>
          <p>
            {tasks.filter((task) => task.completed).length} of {tasks.length} tasks completed
          </p>
          {!tasks.length && !error && <p>No tasks yet. Add your first task above.</p>}
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                <label className="task">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    disabled={busy}
                    onChange={() => toggleTask(task)}
                  />
                  <span className={task.completed ? "completed" : ""}>
                    {task.title}
                  </span>
                </label>
                <button
                  className="delete"
                  disabled={busy}
                  onClick={() => deleteTask(task.id)}
                  aria-label={`Delete ${task.title}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <small>Tasks are stored in PostgreSQL.</small>
    </main>
  );
}
