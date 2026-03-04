/**
 * PostgreSQL connection pool — mangrove_workbench (Azure)
 * Credentials via environment variables; see .env.example
 */
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host:     process.env.MANGROVE_DB_HOST     ?? "pg-mangrove-n8n.postgres.database.azure.com",
  port:     Number(process.env.MANGROVE_DB_PORT ?? 5432),
  database: process.env.MANGROVE_DB_NAME     ?? "mangrove_workbench",
  user:     process.env.MANGROVE_DB_USER     ?? "n8nadmin",
  password: process.env.MANGROVE_DB_PASSWORD,
  ssl:      { rejectUnauthorized: false },
  max:                10,
  idleTimeoutMillis:  30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[mangrove-pg] Pool error:", err.message);
});

pool.on("connect", () => {
  console.log("[mangrove-pg] Client connected to mangrove_workbench");
});

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}
