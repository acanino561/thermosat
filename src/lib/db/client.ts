import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as relations from './relations';

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  const sql = neon(url);
  return drizzle(sql, { schema: { ...schema, ...relations } });
}

type DbType = ReturnType<typeof createDb>;
let _db: DbType | null = null;

export const db = new Proxy({} as DbType, {
  get(_, prop) {
    if (!_db) _db = createDb();
    return (_db as any)[prop];
  },
});

export type Database = DbType;
