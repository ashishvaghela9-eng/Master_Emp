import { Router, type IRouter } from "express";
import { db, branchFileStationTable, assetCuezTable, vpnTable, jiraTable, mailvaultTable, ftpTable, acronisTable, tataTeleTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

async function updateEmployeeAccess(employeeId: string, accessKey: string) {
  if (!employeeId || !accessKey) return;
  try {
    const employees = await db.select().from(employeesTable).where(eq(employeesTable.employeeCode, employeeId));
    if (!employees.length) return;
    const emp = employees[0];
    const currentAccess = (emp.access as Record<string, boolean>) || {};
    const updatedAccess = { ...currentAccess, [accessKey]: true };
    await db.update(employeesTable)
      .set({ access: updatedAccess, updatedAt: new Date() })
      .where(eq(employeesTable.employeeCode, employeeId));
  } catch (err) {
    console.error("Failed to update employee access:", err);
  }
}

function makeModuleRoutes(table: any, accessKey?: string, formatFn?: (r: any) => any) {
  const r: IRouter = Router();
  const fmt = formatFn || ((row: any) => ({
    ...row,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
  }));

  r.get("/", async (_req, res) => {
    try {
      const rows = await db.select().from(table).orderBy(table.id);
      return res.json(rows.map(fmt));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  r.post("/", async (req, res) => {
    try {
      const [row] = await db.insert(table).values(req.body).returning();
      if (accessKey && req.body.employeeId) {
        await updateEmployeeAccess(req.body.employeeId, accessKey);
      }
      return res.status(201).json(fmt(row));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  r.put("/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [row] = await db.update(table).set({ ...req.body, updatedAt: new Date() }).where(eq(table.id, id)).returning();
      if (!row) return res.status(404).json({ error: "Record not found" });
      return res.json(fmt(row));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  r.delete("/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(table).where(eq(table.id, id));
      return res.json({ success: true, message: "Deleted" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return r;
}

router.use("/branch-file-station", makeModuleRoutes(branchFileStationTable));
router.use("/assetcuez", makeModuleRoutes(assetCuezTable, "assetcuez"));
router.use("/vpn", makeModuleRoutes(vpnTable, "vpn"));
router.use("/jira", makeModuleRoutes(jiraTable, "jira"));
router.use("/mailvault", makeModuleRoutes(mailvaultTable, "mailVault"));
router.use("/ftp", makeModuleRoutes(ftpTable));
router.use("/acronis", makeModuleRoutes(acronisTable, "acronisBackup"));
router.use("/tata-tele", makeModuleRoutes(tataTeleTable));

export default router;
