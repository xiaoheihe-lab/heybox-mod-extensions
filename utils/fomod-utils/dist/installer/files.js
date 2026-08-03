import { joinArchivePath, normalizeArchivePath } from '../security/paths.js';
export function expandFileItems(items, archiveFiles, packageRoot) {
    const byLower = new Map(archiveFiles.map((source) => [source.replace(/\\/g, '/').toLowerCase(), source]));
    const mappings = [];
    for (const item of items) {
        const sourceBase = joinArchivePath(packageRoot, item.source);
        if (item.kind === 'file') {
            const actual = byLower.get(sourceBase.toLowerCase());
            if (!actual)
                throw new Error(`FOMOD source file does not exist: ${item.source}`);
            const destination = item.destination || item.source.split('/').pop() || '';
            mappings.push({ source: actual, destination: normalizeArchivePath(destination), priority: item.priority, order: item.order });
            continue;
        }
        const prefix = `${sourceBase.toLowerCase().replace(/\/$/, '')}/`;
        const folderFiles = archiveFiles.filter((source) => source.replace(/\\/g, '/').toLowerCase().startsWith(prefix));
        for (const actual of folderFiles) {
            const normalizedActual = actual.replace(/\\/g, '/');
            const suffix = normalizedActual.slice(sourceBase.length).replace(/^\//, '');
            mappings.push({
                source: actual,
                destination: joinArchivePath(item.destination, suffix),
                priority: item.priority,
                order: item.order,
            });
        }
    }
    mappings.sort((a, b) => a.priority - b.priority || a.order - b.order);
    const finalByDestination = new Map();
    for (const mapping of mappings)
        finalByDestination.set(mapping.destination.toLowerCase(), mapping);
    return [...finalByDestination.values()]
        .sort((a, b) => a.priority - b.priority || a.order - b.order)
        .map((mapping) => ({
        type: 'copy',
        source: mapping.source,
        destination: mapping.destination,
        verification: 'exists',
        conflictPolicy: 'overwrite',
    }));
}
