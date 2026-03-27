import { Router, type IRouter } from "express";
import { db, serviceDefinitionsTable, serviceFieldsTable, appConfigTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

const BUILT_IN_SERVICES = [
  {
    name: "Branch File Station",
    slug: "branch_file_station",
    fields: [
      { fieldName: "username",    fieldLabel: "Username",    fieldType: "text",  isRequired: true,  sortOrder: 1 },
      { fieldName: "password",    fieldLabel: "Password",    fieldType: "text",  isRequired: false, sortOrder: 2 },
      { fieldName: "group_email", fieldLabel: "Group Email", fieldType: "email", isRequired: false, sortOrder: 3 },
      { fieldName: "branch_name", fieldLabel: "Branch Name", fieldType: "text",  isRequired: true,  sortOrder: 4 },
    ],
  },
  {
    name: "Assetcuez",
    slug: "assetcuez",
    fields: [
      { fieldName: "employee_id",       fieldLabel: "Employee ID",        fieldType: "text", isRequired: true,  sortOrder: 1 },
      { fieldName: "first_name",        fieldLabel: "First Name",         fieldType: "text", isRequired: true,  sortOrder: 2 },
      { fieldName: "last_name",         fieldLabel: "Last Name",          fieldType: "text", isRequired: false, sortOrder: 3 },
      { fieldName: "contact_number",    fieldLabel: "Contact Number",     fieldType: "text", isRequired: false, sortOrder: 4 },
      { fieldName: "activation_status", fieldLabel: "Activation Status",  fieldType: "text", isRequired: false, sortOrder: 5 },
    ],
  },
  {
    name: "VPN",
    slug: "vpn_users",
    fields: [
      { fieldName: "employee_id",  fieldLabel: "Employee ID",  fieldType: "text", isRequired: true,  sortOrder: 1 },
      { fieldName: "username",     fieldLabel: "Username",     fieldType: "text", isRequired: true,  sortOrder: 2 },
      { fieldName: "department",   fieldLabel: "Department",   fieldType: "text", isRequired: false, sortOrder: 3 },
      { fieldName: "designation",  fieldLabel: "Designation",  fieldType: "text", isRequired: false, sortOrder: 4 },
      { fieldName: "user_id",      fieldLabel: "User ID",      fieldType: "text", isRequired: false, sortOrder: 5 },
      { fieldName: "password",     fieldLabel: "Password",     fieldType: "text", isRequired: false, sortOrder: 6 },
      { fieldName: "status",       fieldLabel: "Status",       fieldType: "text", isRequired: false, sortOrder: 7 },
    ],
  },
  {
    name: "Jira",
    slug: "jira_users",
    fields: [
      { fieldName: "employee_id",           fieldLabel: "Employee ID",            fieldType: "text",  isRequired: true,  sortOrder: 1 },
      { fieldName: "username",              fieldLabel: "Username",               fieldType: "text",  isRequired: true,  sortOrder: 2 },
      { fieldName: "email",                 fieldLabel: "Email",                  fieldType: "email", isRequired: false, sortOrder: 3 },
      { fieldName: "user_status",           fieldLabel: "User Status",            fieldType: "text",  isRequired: false, sortOrder: 4 },
      { fieldName: "added_to_organization", fieldLabel: "Added to Organization",  fieldType: "text",  isRequired: false, sortOrder: 5 },
    ],
  },
  {
    name: "MailVault",
    slug: "mailvault_users",
    fields: [
      { fieldName: "employee_id", fieldLabel: "Employee ID", fieldType: "text", isRequired: true,  sortOrder: 1 },
      { fieldName: "username",    fieldLabel: "Username",    fieldType: "text", isRequired: true,  sortOrder: 2 },
      { fieldName: "user_id",     fieldLabel: "User ID",     fieldType: "text", isRequired: false, sortOrder: 3 },
      { fieldName: "user_role",   fieldLabel: "User Role",   fieldType: "text", isRequired: false, sortOrder: 4 },
      { fieldName: "password",    fieldLabel: "Password",    fieldType: "text", isRequired: false, sortOrder: 5 },
    ],
  },
  {
    name: "FTP",
    slug: "ftp_users",
    fields: [
      { fieldName: "username", fieldLabel: "Username", fieldType: "text", isRequired: true,  sortOrder: 1 },
      { fieldName: "password", fieldLabel: "Password", fieldType: "text", isRequired: false, sortOrder: 2 },
      { fieldName: "port",     fieldLabel: "Port",     fieldType: "text", isRequired: false, sortOrder: 3 },
      { fieldName: "hostname", fieldLabel: "Hostname", fieldType: "text", isRequired: false, sortOrder: 4 },
      { fieldName: "path",     fieldLabel: "Path",     fieldType: "text", isRequired: false, sortOrder: 5 },
    ],
  },
  {
    name: "Acronis Backup",
    slug: "acronis_records",
    fields: [
      { fieldName: "employee_id",               fieldLabel: "Employee ID",                fieldType: "text", isRequired: true,  sortOrder: 1 },
      { fieldName: "employee_name",             fieldLabel: "Employee Name",              fieldType: "text", isRequired: true,  sortOrder: 2 },
      { fieldName: "department",                fieldLabel: "Department",                 fieldType: "text", isRequired: false, sortOrder: 3 },
      { fieldName: "designation",               fieldLabel: "Designation",                fieldType: "text", isRequired: false, sortOrder: 4 },
      { fieldName: "email",                     fieldLabel: "Email",                      fieldType: "email",isRequired: false, sortOrder: 5 },
      { fieldName: "hostname",                  fieldLabel: "Hostname",                   fieldType: "text", isRequired: false, sortOrder: 6 },
      { fieldName: "backup_plan",               fieldLabel: "Backup Plan",                fieldType: "text", isRequired: false, sortOrder: 7 },
      { fieldName: "backup_plan_name",          fieldLabel: "Backup Plan Name",           fieldType: "text", isRequired: false, sortOrder: 8 },
      { fieldName: "backup_time",               fieldLabel: "Backup Time",                fieldType: "text", isRequired: false, sortOrder: 9 },
      { fieldName: "installation_status",       fieldLabel: "Installation Status",        fieldType: "text", isRequired: false, sortOrder: 10 },
      { fieldName: "backup_status",             fieldLabel: "Backup Status",              fieldType: "text", isRequired: false, sortOrder: 11 },
    ],
  },
  {
    name: "Tata Tele",
    slug: "tata_tele_records",
    fields: [
      { fieldName: "employee_id",   fieldLabel: "Employee ID",    fieldType: "text", isRequired: true,  sortOrder: 1 },
      { fieldName: "employee_name", fieldLabel: "Employee Name",  fieldType: "text", isRequired: true,  sortOrder: 2 },
      { fieldName: "department",    fieldLabel: "Department",     fieldType: "text", isRequired: false, sortOrder: 3 },
      { fieldName: "designation",   fieldLabel: "Designation",    fieldType: "text", isRequired: false, sortOrder: 4 },
      { fieldName: "mobile_number", fieldLabel: "Mobile Number",  fieldType: "text", isRequired: false, sortOrder: 5 },
      { fieldName: "sim_number",    fieldLabel: "SIM Number",     fieldType: "text", isRequired: false, sortOrder: 6 },
      { fieldName: "plan",          fieldLabel: "Plan",           fieldType: "text", isRequired: false, sortOrder: 7 },
      { fieldName: "status",        fieldLabel: "Status",         fieldType: "text", isRequired: false, sortOrder: 8 },
    ],
  },
];

async function seedBuiltIn() {
  for (const svc of BUILT_IN_SERVICES) {
    const existing = await db.select().from(serviceDefinitionsTable).where(eq(serviceDefinitionsTable.slug, svc.slug));
    if (existing.length === 0) {
      const [def] = await db.insert(serviceDefinitionsTable).values({ name: svc.name, slug: svc.slug, isBuiltIn: true }).returning();
      if (def && svc.fields.length > 0) {
        await db.insert(serviceFieldsTable).values(svc.fields.map(f => ({ ...f, serviceId: def.id })));
      }
    }
  }
}

router.get("/", async (_req, res) => {
  try {
    await seedBuiltIn();
    const defs = await db.select().from(serviceDefinitionsTable).orderBy(asc(serviceDefinitionsTable.id));
    const fields = await db.select().from(serviceFieldsTable).orderBy(asc(serviceFieldsTable.serviceId), asc(serviceFieldsTable.sortOrder));

    const result = defs.map(d => ({
      ...d,
      fields: fields.filter(f => f.serviceId === d.id),
    }));
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, fields = [], createTable = false } = req.body;
    if (!name) return res.status(400).json({ error: "Service name is required" });

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const tableName = createTable ? `svc_${slug}` : `svc_noTable_${slug}`;

    const existingDef = await db.select().from(serviceDefinitionsTable).where(eq(serviceDefinitionsTable.slug, tableName));
    if (existingDef.length > 0) return res.status(400).json({ error: "A service with this name already exists" });

    if (createTable) {
      const systemCols = `  id SERIAL PRIMARY KEY,\n  created_at TIMESTAMP DEFAULT NOW() NOT NULL,\n  updated_at TIMESTAMP DEFAULT NOW() NOT NULL`;
      const fieldCols = fields.map((f: any) => {
        const colType = f.fieldType === "number" ? "NUMERIC" : "TEXT";
        const notNull = f.isRequired ? " NOT NULL" : "";
        const safeName = f.fieldName.replace(/[^a-z0-9_]/g, "_");
        return `  ${safeName} ${colType}${notNull}`;
      });
      const allCols = [systemCols, ...fieldCols].join(",\n");
      await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "${tableName}" (\n${allCols}\n)`));
    }

    const [def] = await db.insert(serviceDefinitionsTable).values({
      name: name.trim(),
      slug: tableName,
      isBuiltIn: false,
      hasTable: createTable,
    }).returning();

    if (def && fields.length > 0) {
      await db.insert(serviceFieldsTable).values(
        fields.map((f: any, idx: number) => ({
          serviceId: def.id,
          fieldName: f.fieldName.replace(/[^a-z0-9_]/g, "_"),
          fieldLabel: f.fieldLabel || f.fieldName,
          fieldType: f.fieldType || "text",
          isRequired: f.isRequired || false,
          sortOrder: idx,
        }))
      );
    }
    const fieldRows = await db.select().from(serviceFieldsTable).where(eq(serviceFieldsTable.serviceId, def.id));

    const existing = await db.select().from(appConfigTable)
      .where(and(eq(appConfigTable.type, "service"), eq(appConfigTable.value, name.trim())));
    if (existing.length === 0) {
      await db.insert(appConfigTable).values({ type: "service", value: name.trim() });
    }

    return res.status(201).json({ ...def, fields: fieldRows, createTable });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [def] = await db.select().from(serviceDefinitionsTable).where(eq(serviceDefinitionsTable.id, id));
    if (!def) return res.status(404).json({ error: "Service not found" });
    if (def.isBuiltIn) return res.status(400).json({ error: "Cannot delete built-in services" });

    await db.execute(sql.raw(`DROP TABLE IF EXISTS "${def.slug}"`));
    await db.delete(serviceFieldsTable).where(eq(serviceFieldsTable.serviceId, id));
    await db.delete(serviceDefinitionsTable).where(eq(serviceDefinitionsTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/fields", async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const { fieldName, fieldLabel, fieldType = "text", isRequired = false } = req.body;
    if (!fieldName || !fieldLabel) return res.status(400).json({ error: "fieldName and fieldLabel are required" });

    const [def] = await db.select().from(serviceDefinitionsTable).where(eq(serviceDefinitionsTable.id, serviceId));
    if (!def) return res.status(404).json({ error: "Service not found" });

    const safeName = fieldName.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    const colType = fieldType === "number" ? "NUMERIC" : "TEXT";

    try {
      await db.execute(sql.raw(`ALTER TABLE "${def.slug}" ADD COLUMN IF NOT EXISTS "${safeName}" ${colType}`));
    } catch {
    }

    const existingFields = await db.select().from(serviceFieldsTable).where(eq(serviceFieldsTable.serviceId, serviceId));
    const [field] = await db.insert(serviceFieldsTable).values({
      serviceId,
      fieldName: safeName,
      fieldLabel: fieldLabel.trim(),
      fieldType,
      isRequired,
      sortOrder: existingFields.length,
    }).returning();
    return res.status(201).json(field);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/fields/reorder", async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const { fieldIds } = req.body as { fieldIds: number[] };
    if (!Array.isArray(fieldIds)) return res.status(400).json({ error: "fieldIds array required" });

    for (let i = 0; i < fieldIds.length; i++) {
      await db.update(serviceFieldsTable)
        .set({ sortOrder: i })
        .where(eq(serviceFieldsTable.id, fieldIds[i]));
    }
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/fields/:fieldId", async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const fieldId   = parseInt(req.params.fieldId);

    const [def] = await db.select().from(serviceDefinitionsTable).where(eq(serviceDefinitionsTable.id, serviceId));
    if (!def) return res.status(404).json({ error: "Service not found" });

    const [field] = await db.select().from(serviceFieldsTable).where(eq(serviceFieldsTable.id, fieldId));
    if (!field) return res.status(404).json({ error: "Field not found" });

    try {
      await db.execute(sql.raw(`ALTER TABLE "${def.slug}" DROP COLUMN IF EXISTS "${field.fieldName}"`));
    } catch {
    }

    await db.delete(serviceFieldsTable).where(eq(serviceFieldsTable.id, fieldId));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
