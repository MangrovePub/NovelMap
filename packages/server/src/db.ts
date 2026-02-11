import { Database } from "@novelmap/core";
import { join, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";

const dbPath = process.env.NOVELMAP_DB_PATH ?? join(homedir(), ".novelmap", "novelmap.db");
export const dataDir = dirname(dbPath);
mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);
console.log(`Database: ${dbPath}`);
