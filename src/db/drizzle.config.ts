import { defineConfig } from "drizzle-kit";

const sqlHost = process.env.SQL_HOST || '/tmp';
const sqlDbName = process.env.SQL_DB_NAME || 'postgres';
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || 'postgres';
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || '';

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: false,
  },
  verbose: true,
});
