import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from 'url';

// Получаем dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copyDbFiles() {
  const standaloneDir = path.join(__dirname, "..", ".next", "standalone");

  // Копируем sqlite.db
  await fs.copy(
    path.join(__dirname, "..", "sqlite.db"),
    path.join(standaloneDir, "sqlite.db")
  );

  // Копируем папку drizzle
  await fs.copy(
    path.join(__dirname, "..", "drizzle"),
    path.join(standaloneDir, "drizzle")
  );

  console.log("Database files copied successfully to standalone directory");
}

copyDbFiles().catch(console.error);
