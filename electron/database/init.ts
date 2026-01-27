import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;

  // Development ortamında proje kökünde, prod'da userData klasöründe tut
  const isDev = !app.isPackaged;
  const dbPath = isDev
    ? path.join(process.cwd(), 'logs.db')
    : path.join(app.getPath('userData'), 'logs.db');

  db = new Database(dbPath, { verbose: console.log });
  db.pragma('journal_mode = WAL'); // Performans için

  initSchema();
  return db;
}

function initSchema() {
  if (!db) return;

  const schema = `
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      time TEXT,
      measurement_id TEXT,
      status TEXT,
      measurement_group TEXT,
      measurement_style TEXT,
      color_model TEXT,
      id1 INTEGER,
      id2 INTEGER,
      id3 INTEGER,
      x REAL,
      y REAL,
      z REAL,
      rx REAL,
      ry REAL,
      rz REAL,
      uncertainty REAL,
      measurement_time INTEGER,
      features_ok TEXT,
      error_desc TEXT,
      file_source TEXT,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Hızlı sorgular için indeksler
    CREATE INDEX IF NOT EXISTS idx_logs_measurement_id ON logs(measurement_id);
    CREATE INDEX IF NOT EXISTS idx_logs_date_time ON logs(date, time);
    CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);
  `;

  db.exec(schema);
}
