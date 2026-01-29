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

export function getDashboardStats(selectedFiles?: string[]) {
  const db = getDb();
  if (!db) return { total: 0, failedRate: 0 };

  let whereClause = '';
  const params: string[] = [];

  if (selectedFiles && selectedFiles.length > 0) {
    const placeholders = selectedFiles.map(() => '?').join(', ');
    whereClause = `WHERE file_source IN (${placeholders})`;
    params.push(...selectedFiles);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM logs ${whereClause}`).get(...params) as { count: number };
  const failedQuery = selectedFiles && selectedFiles.length > 0
    ? `SELECT COUNT(*) as count FROM logs WHERE status LIKE 'Failed%' AND file_source IN (${selectedFiles.map(() => '?').join(', ')})`
    : "SELECT COUNT(*) as count FROM logs WHERE status LIKE 'Failed%'";
  const failed = db.prepare(failedQuery).get(...params) as { count: number };

  const failedRate = total.count > 0 ? ((failed.count / total.count) * 100).toFixed(1) : 0;

  return {
    total: total.count,
    failedRate: Number(failedRate)
  };
}

export interface ImportedFile {
  file_source: string;
  imported_at: string;
  record_count: number;
  folder_id: number | null;
}

export function getImportedFiles(): ImportedFile[] {
  const db = getDb();
  if (!db) return [];

  const files = db.prepare(`
    SELECT 
      file_source,
      MIN(imported_at) as imported_at,
      COUNT(*) as record_count,
      MAX(folder_id) as folder_id
    FROM logs
    GROUP BY file_source
    ORDER BY MIN(imported_at) DESC
  `).all() as ImportedFile[];

  return files;
}

// Folder types and functions
export interface Folder {
  id: number;
  name: string;
  created_at: string;
}

export function getFolders(): Folder[] {
  const db = getDb();
  if (!db) return [];

  return db.prepare('SELECT id, name, created_at FROM folders ORDER BY name ASC').all() as Folder[];
}

export function createFolder(name: string): Folder {
  const db = getDb();
  if (!db) throw new Error('Database not initialized');

  const result = db.prepare('INSERT INTO folders (name) VALUES (?)').run(name);
  return {
    id: result.lastInsertRowid as number,
    name,
    created_at: new Date().toISOString()
  };
}

export function renameFolder(id: number, name: string): boolean {
  const db = getDb();
  if (!db) return false;

  const result = db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, id);
  return result.changes > 0;
}

export function deleteFolder(id: number): boolean {
  const db = getDb();
  if (!db) return false;

  // First, unassign all files from this folder
  db.prepare('UPDATE logs SET folder_id = NULL WHERE folder_id = ?').run(id);

  const result = db.prepare('DELETE FROM folders WHERE id = ?').run(id);
  return result.changes > 0;
}

export function assignFileToFolder(fileSource: string, folderId: number | null): boolean {
  const db = getDb();
  if (!db) return false;

  const result = db.prepare('UPDATE logs SET folder_id = ? WHERE file_source = ?').run(folderId, fileSource);
  return result.changes > 0;
}

export function deleteFile(fileSource: string): boolean {
  const db = getDb();
  if (!db) return false;

  const result = db.prepare('DELETE FROM logs WHERE file_source = ?').run(fileSource);
  return result.changes > 0;
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

export interface LogFilters {
  status?: 'all' | 'failed' | 'succeeded';
  dateFrom?: string;
  dateTo?: string;
  errorSearch?: string;
  measurementGroup?: string;
  measurementStyle?: string;
  fileSource?: string;
  sortBy?: 'date' | 'time';
  sortOrder?: 'asc' | 'desc';
}

export function getLogs(page: number = 1, pageSize: number = 50, filters?: LogFilters) {
  const db = getDb();
  if (!db) return { logs: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };

  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Build WHERE conditions based on filters
  if (filters?.status && filters.status !== 'all') {
    if (filters.status === 'failed') {
      conditions.push("status LIKE 'Failed%'");
    } else if (filters.status === 'succeeded') {
      conditions.push("status NOT LIKE 'Failed%'");
    }
  }

  if (filters?.dateFrom) {
    conditions.push("date >= ?");
    params.push(filters.dateFrom);
  }

  if (filters?.dateTo) {
    conditions.push("date <= ?");
    params.push(filters.dateTo);
  }

  if (filters?.errorSearch) {
    conditions.push("error_desc LIKE ?");
    params.push(`%${filters.errorSearch}%`);
  }

  if (filters?.measurementGroup) {
    conditions.push("measurement_group = ?");
    params.push(filters.measurementGroup);
  }

  if (filters?.measurementStyle) {
    conditions.push("measurement_style = ?");
    params.push(filters.measurementStyle);
  }

  if (filters?.fileSource) {
    conditions.push("file_source = ?");
    params.push(filters.fileSource);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Build ORDER BY clause
  const sortColumn = filters?.sortBy || 'date';
  const sortDirection = filters?.sortOrder || 'desc';
  const orderByClause = sortColumn === 'date'
    ? `ORDER BY date ${sortDirection.toUpperCase()}, time ${sortDirection.toUpperCase()}`
    : `ORDER BY time ${sortDirection.toUpperCase()}, date ${sortDirection.toUpperCase()}`;

  const total = db.prepare(`SELECT COUNT(*) as count FROM logs ${whereClause}`).get(...params) as { count: number };
  const logs = db.prepare(`
    SELECT id, date, time, measurement_id, status, measurement_group, 
           measurement_style, color_model, id1, id2, id3, 
           x, y, z, rx, ry, rz, uncertainty, measurement_time, 
           features_ok, error_desc, file_source 
    FROM logs 
    ${whereClause}
    ${orderByClause}
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as LogRecord[];

  return {
    logs,
    total: total.count,
    page,
    pageSize,
    totalPages: Math.ceil(total.count / pageSize)
  };
}

export function getFilterOptions() {
  const db = getDb();
  if (!db) return { measurementGroups: [], measurementStyles: [], fileSources: [] };

  const measurementGroups = db.prepare('SELECT DISTINCT measurement_group FROM logs WHERE measurement_group IS NOT NULL AND measurement_group != "" ORDER BY measurement_group').all() as { measurement_group: string }[];
  const measurementStyles = db.prepare('SELECT DISTINCT measurement_style FROM logs WHERE measurement_style IS NOT NULL AND measurement_style != "" ORDER BY measurement_style').all() as { measurement_style: string }[];
  const fileSources = db.prepare('SELECT DISTINCT file_source FROM logs ORDER BY file_source').all() as { file_source: string }[];

  return {
    measurementGroups: measurementGroups.map(r => r.measurement_group),
    measurementStyles: measurementStyles.map(r => r.measurement_style),
    fileSources: fileSources.map(r => r.file_source)
  };
}
