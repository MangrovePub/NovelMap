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
    this.addColumnIfMissing("manuscript", "cover_url", "TEXT");
    this.addColumnIfMissing("manuscript", "series_order", "INTEGER");
  }

  private addColumnIfMissing(table: string, column: string, type: string): void {
    const cols = this.db.pragma(`table_info(${table})`) as { name: string }[];
    if (!cols.some((c) => c.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  }

  close(): void {
    this.db.close();
  }
}
