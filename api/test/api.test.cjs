const { test } = require("node:test");
const assert = require("node:assert/strict");

const base = process.env.TEST_BASE_URL || "http://localhost:8085";

function request(path, method = "GET", body) {
  return fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
}

test("API and database are ready", async () => {
  const response = await request("/ready");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ready");
  assert.equal(body.database, "connected");
});

test("create, retrieve, complete and delete a task", async () => {
  let id;
  try {
    const title = `CI test ${Date.now()}`;
    const created = await request("/api/tasks", "POST", { title });
    assert.equal(created.status, 201);

    const task = await created.json();
    id = task.id;
    assert.ok(Number.isInteger(id));
    assert.equal(task.title, title);
    assert.equal(task.completed, false);

    const listed = await request("/api/tasks");
    assert.equal(listed.status, 200);
    const tasks = await listed.json();
    assert.ok(tasks.some((item) => item.id === id && item.title === title));

    const updated = await request(`/api/tasks/${id}`, "PATCH", {
      completed: true,
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).completed, true);

    const refreshed = await request("/api/tasks");
    assert.equal(refreshed.status, 200);
    assert.equal(
      (await refreshed.json()).find((item) => item.id === id).completed,
      true
    );

    const deleted = await request(`/api/tasks/${id}`, "DELETE");
    assert.equal(deleted.status, 204);

    const afterDelete = await request("/api/tasks");
    assert.equal(afterDelete.status, 200);
    assert.ok(!(await afterDelete.json()).some((item) => item.id === id));

    const missing = await request(`/api/tasks/${id}`, "PATCH", {
      completed: false,
    });
    assert.equal(missing.status, 404);
    id = undefined;
  } finally {
    if (id !== undefined) {
      await request(`/api/tasks/${id}`, "DELETE");
    }
  }
});

test("reject invalid titles", async () => {
  for (const title of ["", "   ", "x".repeat(201), 123]) {
    const response = await request("/api/tasks", "POST", { title });
    assert.equal(response.status, 400);
  }
});

test("reject invalid task IDs and completion values", async () => {
  const invalidId = await request("/api/tasks/abc", "DELETE");
  assert.equal(invalidId.status, 400);

  const invalidStatus = await request("/api/tasks/1", "PATCH", {
    completed: "yes",
  });
  assert.equal(invalidStatus.status, 400);
});
