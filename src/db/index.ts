import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

const userDataPath = process.cwd()
export const sqlitePath =
  process.env.NODE_ENV === "development"
    ? "sqlite.db"
    : path.join(userDataPath, "sqlite.db");

const sqlite = new Database(sqlitePath);
export const db = drizzle(sqlite, { schema });
