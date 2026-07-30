export declare function normalizeArchivePath(input: unknown, allowEmpty?: boolean): string;
export declare function joinArchivePath(...parts: unknown[]): string;
export declare function findFomodRoot(files: string[]): {
    configPath: string;
    root: string;
} | null;
