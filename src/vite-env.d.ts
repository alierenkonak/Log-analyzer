/// <reference types="vite/client" />

interface Window {
    api: {
        db: {
            getStats: () => Promise<{ total: number; failedRate: number }>;
            importLog: (filePath: string) => Promise<{ success: boolean; count: number }>;
        }
    }
}
