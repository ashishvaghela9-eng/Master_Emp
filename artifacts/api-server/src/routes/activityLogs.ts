import { Router, type IRouter } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { desc, and, gte, lte, eq, ilike, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "500")), 1000);
    const { eventType, email, startDate, endDate } = req.query as Record<string, string>;

    const conditions: any[] = [];

    if (eventType) {
      const types = eventType.split(",").map(t => t.trim()).filter(Boolean);
      if (types.length > 0) {
        conditions.push(inArray(activityLogsTable.eventType, types));
      }
    }

    if (email) {
      conditions.push(ilike(activityLogsTable.userEmail, `%${email}%`));
    }

    if (startDate) {
      conditions.push(gte(activityLogsTable.createdAt, new Date(startDate)));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(activityLogsTable.createdAt, end));
    }

    const rows = await db
      .select()
      .from(activityLogsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(limit);

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/event-types", async (_req, res) => {
  try {
    const rows = await db
      .selectDistinct({ eventType: activityLogsTable.eventType })
      .from(activityLogsTable)
      .orderBy(activityLogsTable.eventType);
    return res.json(rows.map(r => r.eventType).filter(Boolean));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
