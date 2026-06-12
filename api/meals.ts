import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";
import { resolveFamilyId } from "./lib/familyAuth.js";

const router = Router();
router.use(requireAuth);

// ============ Recipes ============

interface RecipeInput {
  title: string;
  description?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
  ingredients?: unknown[];
  steps?: string[];
}

interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  image_url: string | null;
  source_url: string | null;
  tags: string[] | null;
  ingredients: unknown[] | null;
  steps: string[] | null;
}

function recipeRowToDTO(row: RecipeRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    servings: row.servings,
    imageUrl: row.image_url,
    sourceUrl: row.source_url,
    tags: row.tags ?? [],
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
  };
}

// GET /api/meals/recipes?familyId=...
router.get("/recipes", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    const r = await pool.query(
      `SELECT * FROM recipes WHERE family_id = $1 ORDER BY created_at DESC`,
      [familyId],
    );
    res.json(r.rows.map(recipeRowToDTO));
  } catch (err) {
    console.error("List recipes error:", err);
    res.status(500).json({ error: "Failed to list recipes" });
  }
});

// POST /api/meals/recipes { familyId, ...RecipeInput }
router.post("/recipes", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const body = req.body as RecipeInput;
  if (!body.title?.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  try {
    const r = await pool.query(
      `INSERT INTO recipes (family_id, title, description, prep_time, cook_time, servings, image_url, source_url, tags, ingredients, steps)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        familyId,
        body.title.trim(),
        body.description ?? null,
        body.prepTime ?? null,
        body.cookTime ?? null,
        body.servings ?? null,
        body.imageUrl ?? null,
        body.sourceUrl ?? null,
        body.tags ?? [],
        JSON.stringify(body.ingredients ?? []),
        JSON.stringify(body.steps ?? []),
      ],
    );
    res.status(201).json(recipeRowToDTO(r.rows[0]));
  } catch (err) {
    console.error("Create recipe error:", err);
    res.status(500).json({ error: "Failed to create recipe" });
  }
});

// PUT /api/meals/recipes/:id { familyId, ...partial }
router.put("/recipes/:id", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const body = req.body as Partial<RecipeInput>;
  const fields: string[] = [];
  const values: unknown[] = [];
  const push = (sql: string, value: unknown) => {
    values.push(value);
    fields.push(`${sql} = $${values.length}`);
  };
  if (body.title !== undefined) push("title", body.title);
  if (body.description !== undefined) push("description", body.description);
  if (body.prepTime !== undefined) push("prep_time", body.prepTime);
  if (body.cookTime !== undefined) push("cook_time", body.cookTime);
  if (body.servings !== undefined) push("servings", body.servings);
  if (body.imageUrl !== undefined) push("image_url", body.imageUrl);
  if (body.sourceUrl !== undefined) push("source_url", body.sourceUrl);
  if (body.tags !== undefined) push("tags", body.tags);
  if (body.ingredients !== undefined)
    push("ingredients", JSON.stringify(body.ingredients));
  if (body.steps !== undefined) push("steps", JSON.stringify(body.steps));

  if (fields.length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  try {
    values.push(req.params.id, familyId);
    const r = await pool.query(
      `UPDATE recipes SET ${fields.join(", ")}
       WHERE id = $${values.length - 1} AND family_id = $${values.length}
       RETURNING *`,
      values,
    );
    if (r.rows.length === 0) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }
    res.json(recipeRowToDTO(r.rows[0]));
  } catch (err) {
    console.error("Update recipe error:", err);
    res.status(500).json({ error: "Failed to update recipe" });
  }
});

// DELETE /api/meals/recipes/:id?familyId=...
router.delete("/recipes/:id", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    await pool.query(`DELETE FROM recipes WHERE id = $1 AND family_id = $2`, [
      req.params.id,
      familyId,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete recipe error:", err);
    res.status(500).json({ error: "Failed to delete recipe" });
  }
});

// ============ Meal plan ============

// GET /api/meals/plan?familyId=...
router.get("/plan", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    const r = await pool.query(
      `SELECT id, recipe_id, date, meal_type FROM meal_plan WHERE family_id = $1 ORDER BY date ASC`,
      [familyId],
    );
    res.json(
      r.rows.map((row) => ({
        id: row.id,
        recipeId: row.recipe_id,
        date: row.date,
        mealType: row.meal_type,
      })),
    );
  } catch (err) {
    console.error("List meal plan error:", err);
    res.status(500).json({ error: "Failed to list meal plan" });
  }
});

// POST /api/meals/plan { familyId, recipeId, date, mealType }
router.post("/plan", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const { recipeId, date, mealType } = req.body as {
    recipeId?: string;
    date?: string;
    mealType?: string;
  };
  if (!recipeId || !date || !mealType) {
    res.status(400).json({ error: "recipeId, date, mealType are required" });
    return;
  }
  try {
    const r = await pool.query(
      `INSERT INTO meal_plan (family_id, recipe_id, date, meal_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, recipe_id, date, meal_type`,
      [familyId, recipeId, date, mealType],
    );
    const row = r.rows[0];
    res.status(201).json({
      id: row.id,
      recipeId: row.recipe_id,
      date: row.date,
      mealType: row.meal_type,
    });
  } catch (err) {
    console.error("Create meal plan entry error:", err);
    res.status(500).json({ error: "Failed to add meal plan entry" });
  }
});

// DELETE /api/meals/plan/:id?familyId=...
router.delete("/plan/:id", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    await pool.query(`DELETE FROM meal_plan WHERE id = $1 AND family_id = $2`, [
      req.params.id,
      familyId,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete meal plan entry error:", err);
    res.status(500).json({ error: "Failed to delete meal plan entry" });
  }
});

// ============ Shopping list ============

// GET /api/meals/shopping?familyId=...
router.get("/shopping", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    const r = await pool.query(
      `SELECT id, name, amount, unit, category, checked
       FROM shopping_list WHERE family_id = $1 ORDER BY category, name`,
      [familyId],
    );
    res.json(r.rows);
  } catch (err) {
    console.error("List shopping error:", err);
    res.status(500).json({ error: "Failed to list shopping list" });
  }
});

// PUT /api/meals/shopping { familyId, items }
// Replaces the entire list for the family — mirrors the store's updateShoppingList.
router.put("/shopping", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  interface ShoppingItem {
    name: string;
    amount?: number | null;
    unit?: string | null;
    category?: string | null;
    checked?: boolean;
  }
  const items = (req.body as { items?: ShoppingItem[] }).items;
  if (!Array.isArray(items)) {
    res.status(400).json({ error: "items array is required" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM shopping_list WHERE family_id = $1`, [
      familyId,
    ]);
    // Return the inserted rows so the client can adopt the server-assigned
    // ids — later PATCH /shopping/:id calls would otherwise silently match
    // zero rows.
    const inserted = [];
    for (const it of items) {
      const result = await client.query(
        `INSERT INTO shopping_list (family_id, name, amount, unit, category, checked)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, name, amount, unit, category, checked`,
        [
          familyId,
          it.name ?? "",
          it.amount ?? "",
          it.unit ?? "",
          it.category ?? "Other",
          !!it.checked,
        ],
      );
      inserted.push(result.rows[0]);
    }
    await client.query("COMMIT");
    res.json({ ok: true, items: inserted });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update shopping error:", err);
    res.status(500).json({ error: "Failed to update shopping list" });
  } finally {
    client.release();
  }
});

// PATCH /api/meals/shopping/:id { familyId, checked }
router.patch("/shopping/:id", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const { checked } = req.body as { checked?: boolean };
  try {
    await pool.query(
      `UPDATE shopping_list SET checked = $1 WHERE id = $2 AND family_id = $3`,
      [!!checked, req.params.id, familyId],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Toggle shopping error:", err);
    res.status(500).json({ error: "Failed to toggle item" });
  }
});

export default router;
