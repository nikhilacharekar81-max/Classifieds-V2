import { defineConfig } from "drizzle-kit";

const dbCredentials = process.env.DATABASE_URL
  ? { url: process.env.DATABASE_URL }
  : {
      host: process.env.SQL_HOST || '/tmp',
      user: process.env.SQL_ADMIN_USER || process.env.SQL_USER || 'postgres',
      password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || '',
      database: process.env.SQL_DB_NAME || 'postgres',
      ssl: process.env.SQL_SSL === 'true',
    };

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials,
  verbose: true,
});
