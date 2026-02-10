import SQLite from "better-sqlite3";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Database {
  db: SQLite.Database;

  constructor(dbPath: string = ":memory:") {
    this.db = new SQLite(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  private migrate(): void {
    const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
    this.db.exec(schema);
  }

  close(): void {
    this.db.close();
  }
}
