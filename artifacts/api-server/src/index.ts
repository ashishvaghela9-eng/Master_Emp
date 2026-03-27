import app from "./app";
import { db, systemUsersTable } from "@workspace/db";
import bcrypt from "bcryptjs";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function seedAdminUser() {
  try {
    const existing = await db.select().from(systemUsersTable);
    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash("admin@123", 10);
      await db.insert(systemUsersTable).values({
        name: "Ashish Vaghela",
        email: "ashish.vaghela@lightfinance.com",
        passwordHash,
        role: "admin",
      });
      console.log("Default admin user created.");
    }
  } catch (err) {
    console.error("Error seeding admin user:", err);
  }
}

seedAdminUser().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
