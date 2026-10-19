import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "./types.js";

export * from "./types.js";

function intFromEnv(name: string, fallback: number): number {
  const val = process.env[name];
  if (val === undefined || val.trim() === "") return fallback;
  const parsed = Number(val);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function createDb(connectionString: string): Kysely<Database> {
  const max = Math.max(1, intFromEnv("DB_POOL_MAX", 10));
  const statementTimeout = intFromEnv("DB_STATEMENT_TIMEOUT_MS", 30_000);

  const pool = new pg.Pool({
    connectionString,
    max,
    connectionTimeoutMillis: 10_000,
    statement_timeout: statementTimeout,
  });

  // Log idle client errors rather than letting node-postgres emit unhandled 'error'
  // events that terminate the backend process. Also, because migrations go through
  // createDb, operators running long-running migrations can set DB_STATEMENT_TIMEOUT_MS=0.
  pool.on("error", (err) => {
    console.error("[db] idle client error:", err.message);
  });

  const dialect = new PostgresDialect({ pool });
  return new Kysely<Database>({ dialect });
}
