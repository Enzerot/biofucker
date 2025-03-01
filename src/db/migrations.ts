import { migrate } from "drizzle-orm/neon-http/migrator";
import { db } from "./index";

export async function runMigrations() {
  console.log("Запуск миграций...");
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Миграции выполнены успешно!");
} 