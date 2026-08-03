export declare class FomodError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(code: string, message: string, details?: unknown);
}
export declare function asFomodError(error: unknown, fallbackCode?: string): FomodError;
