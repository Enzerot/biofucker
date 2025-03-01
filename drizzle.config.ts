import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  verbose: true,
  strict: true,
  dialect: "postgresql",
});
