import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const serviceDefinitionsTable = pgTable("service_definitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isBuiltIn: boolean("is_built_in").default(false),
  hasTable: boolean("has_table").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceFieldsTable = pgTable("service_fields", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  fieldName: text("field_name").notNull(),
  fieldLabel: text("field_label").notNull(),
  fieldType: text("field_type").notNull().default("text"),
  isRequired: boolean("is_required").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ServiceDefinition = typeof serviceDefinitionsTable.$inferSelect;
export type ServiceField = typeof serviceFieldsTable.$inferSelect;
