import { getDb } from './init';
import { LogEntry } from '../utils/logParser';

export function insertLogs(logs: LogEntry[], fileSource: string) {
  const db = getDb();
  if (!db) throw new Error('Database not initialized');

  const insert = db.prepare(`
    INSERT INTO logs (
      date, time, measurement_id, status, measurement_group, measurement_style,
      color_model, id1, id2, id3, x, y, z, rx, ry, rz, uncertainty,
      measurement_time, features_ok, error_desc, file_source
    ) VALUES (
      @date, @time, @measurementId, @state, @measurementGroup, @measurementStyle,
      @colorModel, @id1, @id2, @id3, @x, @y, @z, @rx, @ry, @rz, @uncertainty,
      @measurementTime, @featuresOk, @errorDesc, @fileSource
    )
  `);

  const insertMany = db.transaction((entries: LogEntry[]) => {
    for (const log of entries) {
      insert.run({ ...log, fileSource });
    }
  });

  insertMany(logs);
  return logs.length;
}

export function getDashboardStats() {
  const db = getDb();
  if (!db) return { total: 0, failedRate: 0 };

  const total = db.prepare('SELECT COUNT(*) as count FROM logs').get() as { count: number };
  const failed = db.prepare("SELECT COUNT(*) as count FROM logs WHERE status LIKE 'Failed%'").get() as { count: number };

  const failedRate = total.count > 0 ? ((failed.count / total.count) * 100).toFixed(1) : 0;

  return {
    total: total.count,
    failedRate: Number(failedRate)
  };
}

export interface LogRecord {
  id: number;
  date: string;
  time: string;
  measurement_id: string;
  status: string;
  measurement_group: string;
  measurement_style: string;
  color_model: string;
  id1: number;
  id2: number;
  id3: number;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  uncertainty: number;
  measurement_time: number;
  features_ok: string;
  error_desc: string;
  file_source: string;
}

export function getLogs(page: number = 1, pageSize: number = 50) {
  const db = getDb();
  if (!db) return { logs: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };

  const offset = (page - 1) * pageSize;

  const total = db.prepare('SELECT COUNT(*) as count FROM logs').get() as { count: number };
  const logs = db.prepare(`
    SELECT id, date, time, measurement_id, status, measurement_group, 
           measurement_style, color_model, id1, id2, id3, 
           x, y, z, rx, ry, rz, uncertainty, measurement_time, 
           features_ok, error_desc, file_source 
    FROM logs 
    ORDER BY date DESC, time DESC 
    LIMIT ? OFFSET ?
  `).all(pageSize, offset) as LogRecord[];

  return {
    logs,
    total: total.count,
    page,
    pageSize,
    totalPages: Math.ceil(total.count / pageSize)
  };
}
