const DRIVE_OR_UNC = /^(?:[a-z]:|\\\\|\/\/)/i;
export function normalizeArchivePath(input, allowEmpty = false) {
    const raw = String(input ?? '').replace(/\\/g, '/').trim();
    if (!raw) {
        if (allowEmpty)
            return '';
        throw new Error('FOMOD path is empty');
    }
    if (raw.startsWith('/') || DRIVE_OR_UNC.test(raw) || raw.includes('\0')) {
        throw new Error(`Unsafe FOMOD path: ${raw}`);
    }
    const parts = [];
    for (const part of raw.split('/')) {
        if (!part || part === '.')
            continue;
        if (part === '..')
            throw new Error(`FOMOD path traversal is not allowed: ${raw}`);
        parts.push(part);
    }
    if (parts.length === 0 && !allowEmpty)
        throw new Error(`Invalid FOMOD path: ${raw}`);
    return parts.join('/');
}
export function joinArchivePath(...parts) {
    return normalizeArchivePath(parts.filter((part) => String(part ?? '').trim()).join('/'), true);
}
export function findFomodRoot(files) {
    const matches = files
        .map((source) => ({ source, normalized: normalizeArchivePath(source) }))
        .filter(({ normalized }) => {
        const parts = normalized.split('/').filter(Boolean);
        if (parts.length !== 2 && parts.length !== 3)
            return false;
        return parts[parts.length - 2]?.toLowerCase() === 'fomod'
            && parts[parts.length - 1]?.toLowerCase() === 'moduleconfig.xml';
    });
    if (matches.length === 0)
        return null;
    const unique = new Map(matches.map((entry) => [entry.normalized.toLowerCase(), entry]));
    if (unique.size !== 1)
        throw new Error('FOMOD package contains multiple ModuleConfig.xml files');
    const entry = [...unique.values()][0];
    const suffixLength = 'fomod/moduleconfig.xml'.length;
    return {
        configPath: entry.source,
        root: entry.normalized.slice(0, Math.max(0, entry.normalized.length - suffixLength)).replace(/\/$/, ''),
    };
}
