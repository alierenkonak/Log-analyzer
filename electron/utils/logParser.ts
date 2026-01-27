export interface LogEntry {
    date: string;
    time: string;
    measurementId: string;
    state: string;
    measurementGroup: string;
    measurementStyle: string;
    colorModel: string;
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
    measurementTime: number;
    featuresOk: string;
    errorDesc: string;
}

export function parseLogFile(content: string): LogEntry[] {
    const lines = content.trim().split('\n');
    const entries: LogEntry[] = [];

    // Skip header line (index 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split('\t');

        // Safety check for column count (approx 20 cols)
        if (columns.length < 15) continue;

        // Helper to parse float with comma
        const parseFloatComma = (val: string) => {
            if (!val) return 0;
            return parseFloat(val.replace(',', '.').trim()) || 0;
        };

        // Helper to parse int safe
        const parseIntSafe = (val: string) => {
            return parseInt(val?.trim() || '0', 10);
        };

        try {
            const entry: LogEntry = {
                date: columns[0].trim(),
                time: columns[1].trim(),
                measurementId: columns[2].trim(),
                state: columns[3].trim(),
                measurementGroup: columns[4].trim(),
                measurementStyle: columns[5].trim(),
                colorModel: columns[6].trim(),
                id1: parseIntSafe(columns[7]),
                id2: parseIntSafe(columns[8]),
                id3: parseIntSafe(columns[9]),
                x: parseFloatComma(columns[10]),
                y: parseFloatComma(columns[11]),
                z: parseFloatComma(columns[12]),
                rx: parseFloatComma(columns[13]),
                ry: parseFloatComma(columns[14]),
                rz: parseFloatComma(columns[15]),
                uncertainty: parseFloatComma(columns[16]),
                measurementTime: parseIntSafe(columns[17]),
                featuresOk: columns[18]?.trim() || '',
                errorDesc: columns[19]?.trim() || '',
            };
            entries.push(entry);
        } catch (e) {
            console.warn(`Skipping invalid line ${i + 1}:`, e);
        }
    }

    return entries;
}
