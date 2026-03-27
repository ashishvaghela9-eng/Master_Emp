import { Router, type IRouter } from "express";
import { db, appConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(appConfigTable).orderBy(appConfigTable.type, appConfigTable.value);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { type, value } = req.body;
    if (!type || !value) return res.status(400).json({ error: "type and value are required" });
    const [row] = await db.insert(appConfigTable).values({ type, value }).returning();
    return res.status(201).json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bulk", async (req, res) => {
  try {
    const { type, values } = req.body;
    if (!type || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ error: "type and values[] are required" });
    }
    const trimmed = values.map((v: string) => String(v).trim()).filter(Boolean);
    if (trimmed.length === 0) return res.status(400).json({ error: "No valid values provided" });
    const existing = await db.select().from(appConfigTable).where(eq(appConfigTable.type, type));
    const existingValues = new Set(existing.map(r => r.value.toLowerCase()));
    const newValues = trimmed.filter(v => !existingValues.has(v.toLowerCase()));
    let inserted: any[] = [];
    if (newValues.length > 0) {
      inserted = await db
        .insert(appConfigTable)
        .values(newValues.map(value => ({ type, value })))
        .returning();
    }
    return res.status(201).json({ inserted: inserted.length, skipped: trimmed.length - newValues.length, rows: inserted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { value } = req.body;
    if (!value) return res.status(400).json({ error: "value is required" });
    const [row] = await db.update(appConfigTable).set({ value: value.trim() }).where(eq(appConfigTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Item not found" });
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(appConfigTable).where(eq(appConfigTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
