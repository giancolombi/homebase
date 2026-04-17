import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";
import { resolveFamilyId } from "./lib/familyAuth.js";

const router = Router();

router.use(requireAuth as any);

// ============ Task categories ============

// GET /api/tasks/categories?familyId=...
router.get("/categories", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    const r = await pool.query(
      `SELECT id, name, icon FROM task_categories WHERE family_id = $1 ORDER BY created_at ASC`,
      [familyId],
    );
    res.json(r.rows);
  } catch (err: any) {
    console.error("List task categories error:", err);
    res.status(500).json({ error: "Failed to list categories" });
  }
});

// POST /api/tasks/categories  { familyId, name, icon? }
router.post("/categories", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const { name, icon } = req.body as { name?: string; icon?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const r = await pool.query(
      `INSERT INTO task_categories (family_id, name, icon)
       VALUES ($1, $2, $3) RETURNING id, name, icon`,
      [familyId, name.trim(), icon ?? null],
    );
    res.status(201).json(r.rows[0]);
  } catch (err: any) {
    console.error("Create task category error:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// DELETE /api/tasks/categories/:id?familyId=...
router.delete("/categories/:id", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    await pool.query(
      `DELETE FROM task_categories WHERE id = $1 AND family_id = $2`,
      [req.params.id, familyId],
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error("Delete task category error:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ============ Tasks ============

interface TaskInput {
  id?: string;
  title: string;
  description?: string | null;
  categoryId?: string | null;
  deadline?: string | null;
  deadlineTime?: string | null;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  status?: "todo" | "in-progress" | "done";
  assignedTo?: string[];
}

async function loadTask(familyId: string, taskId: string) {
  const taskRes = await pool.query(
    `SELECT id, title, description, category_id, deadline, deadline_time,
            recurrence, status, created_at
     FROM tasks WHERE id = $1 AND family_id = $2`,
    [taskId, familyId],
  );
  if (taskRes.rows.length === 0) return null;

  const assigneesRes = await pool.query(
    `SELECT member_id FROM task_assignments WHERE task_id = $1`,
    [taskId],
  );

  const row = taskRes.rows[0];
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    deadline: row.deadline,
    deadlineTime: row.deadline_time,
    recurrence: row.recurrence,
    status: row.status,
    assignedTo: assigneesRes.rows.map((r) => r.member_id as string),
    createdAt: row.created_at,
  };
}

// GET /api/tasks?familyId=...
router.get("/", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    const tasksRes = await pool.query(
      `SELECT id, title, description, category_id, deadline, deadline_time,
              recurrence, status, created_at
       FROM tasks WHERE family_id = $1 ORDER BY created_at DESC`,
      [familyId],
    );
    const ids = tasksRes.rows.map((r) => r.id);
    const assigneesRes = ids.length
      ? await pool.query(
          `SELECT task_id, member_id FROM task_assignments WHERE task_id = ANY($1::uuid[])`,
          [ids],
        )
      : { rows: [] as { task_id: string; member_id: string }[] };

    const assigneesByTask = new Map<string, string[]>();
    for (const row of assigneesRes.rows) {
      const arr = assigneesByTask.get(row.task_id) ?? [];
      arr.push(row.member_id);
      assigneesByTask.set(row.task_id, arr);
    }

    res.json(
      tasksRes.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        categoryId: row.category_id,
        deadline: row.deadline,
        deadlineTime: row.deadline_time,
        recurrence: row.recurrence,
        status: row.status,
        assignedTo: assigneesByTask.get(row.id) ?? [],
        createdAt: row.created_at,
      })),
    );
  } catch (err: any) {
    console.error("List tasks error:", err);
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

// POST /api/tasks  { familyId, ...TaskInput }
router.post("/", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const body = req.body as TaskInput & { familyId: string };
  if (!body.title?.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `INSERT INTO tasks (family_id, title, description, category_id, deadline, deadline_time, recurrence, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        familyId,
        body.title.trim(),
        body.description ?? null,
        body.categoryId ?? null,
        body.deadline ?? null,
        body.deadlineTime ?? null,
        body.recurrence ?? "none",
        body.status ?? "todo",
      ],
    );
    const taskId = r.rows[0].id as string;

    if (body.assignedTo?.length) {
      await client.query(
        `INSERT INTO task_assignments (task_id, member_id)
         SELECT $1, unnest($2::uuid[])`,
        [taskId, body.assignedTo],
      );
    }
    await client.query("COMMIT");
    const task = await loadTask(familyId, taskId);
    res.status(201).json(task);
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Create task error:", err);
    res.status(500).json({ error: "Failed to create task" });
  } finally {
    client.release();
  }
});

// PUT /api/tasks/:id  { familyId, ...partial TaskInput }
router.put("/:id", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const id = req.params.id as string;
  const body = req.body as Partial<TaskInput>;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT 1 FROM tasks WHERE id = $1 AND family_id = $2`,
      [id, familyId],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Task not found" });
      return;
    }

    // Dynamically build an UPDATE using whichever fields are present.
    const fields: string[] = [];
    const values: any[] = [];
    const pushField = (sql: string, value: any) => {
      values.push(value);
      fields.push(`${sql} = $${values.length}`);
    };
    if (body.title !== undefined) pushField("title", body.title);
    if (body.description !== undefined)
      pushField("description", body.description);
    if (body.categoryId !== undefined)
      pushField("category_id", body.categoryId);
    if (body.deadline !== undefined) pushField("deadline", body.deadline);
    if (body.deadlineTime !== undefined)
      pushField("deadline_time", body.deadlineTime);
    if (body.recurrence !== undefined) pushField("recurrence", body.recurrence);
    if (body.status !== undefined) pushField("status", body.status);

    if (fields.length > 0) {
      values.push(id, familyId);
      await client.query(
        `UPDATE tasks SET ${fields.join(", ")} WHERE id = $${values.length - 1} AND family_id = $${values.length}`,
        values,
      );
    }

    if (body.assignedTo !== undefined) {
      await client.query(`DELETE FROM task_assignments WHERE task_id = $1`, [
        id,
      ]);
      if (body.assignedTo.length > 0) {
        await client.query(
          `INSERT INTO task_assignments (task_id, member_id)
           SELECT $1, unnest($2::uuid[])`,
          [id, body.assignedTo],
        );
      }
    }

    await client.query("COMMIT");
    const task = await loadTask(familyId, id);
    res.json(task);
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Update task error:", err);
    res.status(500).json({ error: "Failed to update task" });
  } finally {
    client.release();
  }
});

// DELETE /api/tasks/:id?familyId=...
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    await pool.query(`DELETE FROM tasks WHERE id = $1 AND family_id = $2`, [
      req.params.id,
      familyId,
    ]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("Delete task error:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
