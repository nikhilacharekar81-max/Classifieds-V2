import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const poolConfig: PoolConfig = {
      max: 10,
      connectionTimeoutMillis: 15000,
    };

    if (process.env.DATABASE_URL) {
      poolConfig.connectionString = process.env.DATABASE_URL;
      if (process.env.SQL_SSL === 'true') {
        poolConfig.ssl = { rejectUnauthorized: false };
      }
    } else {
      poolConfig.host = process.env.SQL_HOST;
      poolConfig.user = process.env.SQL_USER;
      poolConfig.password = process.env.SQL_PASSWORD;
      poolConfig.database = process.env.SQL_DB_NAME;
      if (process.env.SQL_PORT) {
        poolConfig.port = Number(process.env.SQL_PORT);
      }
      if (process.env.SQL_SSL === 'true') {
        poolConfig.ssl = { rejectUnauthorized: false };
      }
    }

    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema });
