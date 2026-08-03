export class FomodError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = 'FomodError';
        this.code = code;
        this.details = details;
    }
}
export function asFomodError(error, fallbackCode = 'FOMOD_INVALID_CONFIG') {
    if (error instanceof FomodError)
        return error;
    const value = error;
    return new FomodError(String(value?.code || fallbackCode), String(value?.message || value || 'FOMOD installation failed'), value?.details);
}
