import { Router, type IRouter } from "express";
import { db, serviceDefinitionsTable, serviceFieldsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [def] = await db.select().from(serviceDefinitionsTable).where(eq(serviceDefinitionsTable.slug, slug));
    if (!def) return res.status(404).json({ error: "Service not found" });

    const fields = await db.select().from(serviceFieldsTable)
      .where(eq(serviceFieldsTable.serviceId, def.id))
      .orderBy(asc(serviceFieldsTable.sortOrder));

    let records: any[] = [];
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM "${slug}" ORDER BY id DESC`));
      records = (result as any).rows ?? result ?? [];
    } catch {
      records = [];
    }

    return res.json({ definition: { ...def, fields }, records });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:slug/records", async (req, res) => {
  try {
    const { slug } = req.params;
    const [def] = await db.select().from(serviceDefinitionsTable).where(eq(serviceDefinitionsTable.slug, slug));
    if (!def) return res.status(404).json({ error: "Service not found" });

    const data = req.body as Record<string, any>;
    const keys = Object.keys(data).filter(k => k !== "id" && k !== "created_at" && k !== "updated_at");
    if (keys.length === 0) {
      const result = await db.execute(sql.raw(`INSERT INTO "${slug}" DEFAULT VALUES RETURNING *`));
      const rows = (result as any).rows ?? result ?? [];
      return res.status(201).json(rows[0] ?? {});
    }

    const colNames = keys.map(k => `"${k.replace(/[^a-z0-9_]/gi, "_")}"`).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const values = keys.map(k => data[k] ?? null);

    const result = await db.execute(sql.raw(
      `INSERT INTO "${slug}" (${colNames}) VALUES (${placeholders}) RETURNING *`,
      values
    ));
    const rows = (result as any).rows ?? result ?? [];
    return res.status(201).json(rows[0] ?? {});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:slug/records/:id", async (req, res) => {
  try {
    const { slug, id } = req.params;
    const [def] = await db.select().from(serviceDefinitionsTable).where(eq(serviceDefinitionsTable.slug, slug));
    if (!def) return res.status(404).json({ error: "Service not found" });

    const data = req.body as Record<string, any>;
    const keys = Object.keys(data).filter(k => k !== "id" && k !== "created_at" && k !== "updated_at");
    if (keys.length === 0) return res.status(400).json({ error: "No fields to update" });

    const setClauses = keys.map((k, i) => `"${k.replace(/[^a-z0-9_]/gi, "_")}" = $${i + 1}`).join(", ");
    const values = keys.map(k => data[k] ?? null);
    values.push(id);

    const result = await db.execute(sql.raw(
      `UPDATE "${slug}" SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
      values
    ));
    const rows = (result as any).rows ?? result ?? [];
    return res.json(rows[0] ?? {});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:slug/records/:id", async (req, res) => {
  try {
    const { slug, id } = req.params;
    const [def] = await db.select().from(serviceDefinitionsTable).where(eq(serviceDefinitionsTable.slug, slug));
    if (!def) return res.status(404).json({ error: "Service not found" });

    await db.execute(sql.raw(`DELETE FROM "${slug}" WHERE id = $1`, [id]));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
