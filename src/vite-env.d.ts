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

interface Window {
    api: {
        db: {
            getStats: () => Promise<{ total: number; failedRate: number }>;
            importLog: (filePath: string) => Promise<{ success: boolean; count: number; error?: string }>;
            getLogs: (page: number, pageSize: number) => Promise<LogsResponse>;
        };
        dialog: {
            selectLogFile: () => Promise<string | null>;
        };
    }
}
