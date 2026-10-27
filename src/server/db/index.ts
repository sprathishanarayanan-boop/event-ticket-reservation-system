import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { Pool, PoolClient } from 'pg';
import { config } from '../config';

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  getOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid?: number | bigint }>;
  transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface ITransaction {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  getOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid?: number | bigint }>;
}

class SQLiteDatabase implements IDatabase {
  private db: DatabaseSync;
  private txMutex: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(filePath);
    // Enable WAL mode for high concurrency
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA busy_timeout = 10000;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.initSchema();
  }

  private initSchema() {
    const candidates = [
      path.resolve(__dirname, 'schema.sql'),
      path.resolve(__dirname, '../../../src/server/db/schema.sql'),
      path.resolve(process.cwd(), 'src/server/db/schema.sql'),
    ];
    for (const schemaPath of candidates) {
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        this.db.exec(sql);
        return;
      }
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params) as T | undefined;
    return result || null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid?: number | bigint }> {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: Number(result.changes),
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  async transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T> {
    // Acquire mutex for transaction serialization
    let releaseMutex: () => void;
    const nextMutex = new Promise<void>((resolve) => {
      releaseMutex = resolve;
    });

    const previousMutex = this.txMutex;
    this.txMutex = nextMutex;

    await previousMutex;

    try {
      this.db.exec('BEGIN IMMEDIATE;');
      const tx: ITransaction = {
        query: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
          const stmt = this.db.prepare(sql);
          return stmt.all(...params) as R[];
        },
        getOne: async <R = any>(sql: string, params: any[] = []): Promise<R | null> => {
          const stmt = this.db.prepare(sql);
          const res = stmt.get(...params) as R | undefined;
          return res || null;
        },
        execute: async (sql: string, params: any[] = []) => {
          const stmt = this.db.prepare(sql);
          const res = stmt.run(...params);
          return {
            changes: Number(res.changes),
            lastInsertRowid: res.lastInsertRowid,
          };
        },
      };

      const result = await fn(tx);
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK;');
      } catch {
        // ignore rollback error if already rolled back
      }
      throw err;
    } finally {
      releaseMutex!();
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

class PostgresDatabase implements IDatabase {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
    this.initSchema();
  }

  private async initSchema() {
    const candidates = [
      path.resolve(__dirname, 'schema.sql'),
      path.resolve(__dirname, '../../../src/server/db/schema.sql'),
      path.resolve(process.cwd(), 'src/server/db/schema.sql'),
    ];
    let sql: string | null = null;
    for (const schemaPath of candidates) {
      if (fs.existsSync(schemaPath)) {
        sql = fs.readFileSync(schemaPath, 'utf-8');
        break;
      }
    }
    if (sql) {
      sql = sql.replace(/DATETIME/g, 'TIMESTAMP')
               .replace(/REAL/g, 'NUMERIC(10,2)');
      try {
        await this.pool.query(sql);
      } catch (e) {
        console.warn('Postgres schema init note:', (e as Error).message);
      }
    }
  }

  // Convert ? to $1, $2, etc for Postgres
  private formatSql(sql: string): string {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const res = await this.pool.query(this.formatSql(sql), params);
    return res.rows as T[];
  }

  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const res = await this.pool.query(this.formatSql(sql), params);
    return (res.rows[0] as T) || null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
    const res = await this.pool.query(this.formatSql(sql), params);
    return { changes: res.rowCount || 0 };
  }

  async transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const tx: ITransaction = {
        query: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
          const res = await client.query(this.formatSql(sql), params);
          return res.rows as R[];
        },
        getOne: async <R = any>(sql: string, params: any[] = []): Promise<R | null> => {
          const res = await client.query(this.formatSql(sql), params);
          return (res.rows[0] as R) || null;
        },
        execute: async (sql: string, params: any[] = []) => {
          const res = await client.query(this.formatSql(sql), params);
          return { changes: res.rowCount || 0 };
        },
      };
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db: IDatabase = config.databaseUrl
  ? new PostgresDatabase(config.databaseUrl)
  : new SQLiteDatabase(config.dbFile);
