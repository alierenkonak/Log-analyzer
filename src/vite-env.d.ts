/// <reference types="vite/client" />

interface LogRecord {
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

interface LogsResponse {
    logs: LogRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

interface LogFilters {
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

interface FilterOptions {
    measurementGroups: string[];
    measurementStyles: string[];
    fileSources: string[];
}

interface ImportedFile {
    file_source: string;
    imported_at: string;
    record_count: number;
    folder_id: number | null;
}

interface Folder {
    id: number;
    name: string;
    created_at: string;
}

type FileScope = 'dashboard' | 'logs' | 'both';

interface Window {
    api: {
        db: {
            getStats: (selectedFiles?: string[]) => Promise<{ total: number; failedRate: number }>;
            importLog: (filePath: string) => Promise<{ success: boolean; count: number; error?: string }>;
            getLogs: (page: number, pageSize: number, filters?: LogFilters) => Promise<LogsResponse>;
            getFilterOptions: () => Promise<FilterOptions>;
            getImportedFiles: () => Promise<ImportedFile[]>;
            // Folder operations
            getFolders: () => Promise<Folder[]>;
            createFolder: (name: string) => Promise<Folder>;
            renameFolder: (id: number, name: string) => Promise<boolean>;
            deleteFolder: (id: number) => Promise<boolean>;
            assignFileToFolder: (fileSource: string, folderId: number | null) => Promise<boolean>;
            deleteFile: (fileSource: string) => Promise<boolean>;
        };
        dialog: {
            selectLogFile: () => Promise<string | null>;
        };
    }
}
