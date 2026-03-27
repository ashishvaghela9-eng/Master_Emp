import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: text("user_email"),
  action: text("action").notNull(),
  eventType: text("event_type"),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  description: text("description"),
  browser: text("browser"),
  device: text("device"),
  browserIp: text("browser_ip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogsTable.$inferSelect;
