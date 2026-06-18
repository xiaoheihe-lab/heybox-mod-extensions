function isUnsafeSegment(segment) {
    return segment === '.' || segment === '..' || segment.includes('\0');
}
export function normalizeArchivePath(filePath) {
    const raw = String(filePath || '');
    if (raw.includes('\0') || raw.includes('://'))
        return null;
    const normalized = raw
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .replace(/^(\.\/)+/g, '')
        .replace(/\/+/g, '/')
        .trim();
    if (!normalized || normalized.endsWith('/'))
        return null;
    if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized))
        return null;
    const segments = normalized.split('/').filter(Boolean);
    if (segments.some(isUnsafeSegment))
        return null;
    return segments.join('/');
}
export function normalizeEntries(files) {
    return files
        .map((file) => {
        const source = normalizeArchivePath(file);
        if (!source)
            return null;
        return {
            source,
            segments: source.split('/'),
        };
    })
        .filter(Boolean);
}
export function archiveBaseName(filePath) {
    const normalized = normalizeArchivePath(filePath);
    if (!normalized)
        return '';
    const parts = normalized.split('/');
    return parts[parts.length - 1] || '';
}
export function archiveExtName(filePath) {
    const base = archiveBaseName(filePath);
    const dot = base.lastIndexOf('.');
    return dot >= 0 ? base.slice(dot).toLowerCase() : '';
}
function hasSegment(entry, marker) {
    const expected = marker.toLowerCase();
    return entry.segments.some((segment) => segment.toLowerCase() === expected);
}
function findSegmentIndex(entry, marker) {
    const expected = marker.toLowerCase();
    return entry.segments.findIndex((segment) => segment.toLowerCase() === expected);
}
function joinPath(pathApi, ...segments) {
    return pathApi.join(...segments.filter(Boolean));
}
function getFileFlags(files) {
    const flags = {
        hasDinput: false,
        hasReframework: false,
        hasAutorun: false,
        hasPlugins: false,
        hasNatives: false,
        hasPak: false,
    };
    for (const entry of normalizeEntries(files)) {
        const base = entry.segments[entry.segments.length - 1]?.toLowerCase() || '';
        if (base === 'dinput8.dll')
            flags.hasDinput = true;
        if (hasSegment(entry, 'reframework'))
            flags.hasReframework = true;
        if (hasSegment(entry, 'autorun'))
            flags.hasAutorun = true;
        if (hasSegment(entry, 'plugins'))
            flags.hasPlugins = true;
        if (hasSegment(entry, 'natives'))
            flags.hasNatives = true;
        if (archiveExtName(entry.source) === '.pak')
            flags.hasPak = true;
    }
    return flags;
}
function toTesterResult(gameId, expectedGameId, supported) {
    return {
        supported: Number(gameId) === expectedGameId && supported,
        requiredFiles: [],
    };
}
export function testReEngineReframeworkLoader(files, gameId, expectedGameId) {
    return toTesterResult(gameId, expectedGameId, getFileFlags(files).hasDinput);
}
export function testReEngineReframework(files, gameId, expectedGameId) {
    const flags = getFileFlags(files);
    return toTesterResult(gameId, expectedGameId, !flags.hasDinput && flags.hasReframework);
}
export function testReEngineAutorun(files, gameId, expectedGameId) {
    const flags = getFileFlags(files);
    return toTesterResult(gameId, expectedGameId, !flags.hasDinput && !flags.hasReframework && flags.hasAutorun);
}
export function testReEnginePlugins(files, gameId, expectedGameId) {
    const flags = getFileFlags(files);
    return toTesterResult(gameId, expectedGameId, !flags.hasDinput && !flags.hasReframework && !flags.hasAutorun && flags.hasPlugins);
}
export function testReEngineNatives(files, gameId, expectedGameId) {
    const flags = getFileFlags(files);
    return toTesterResult(gameId, expectedGameId, !flags.hasDinput && !flags.hasReframework && !flags.hasAutorun && !flags.hasPlugins && flags.hasNatives);
}
export function testReEnginePak(files, gameId, expectedGameId) {
    const flags = getFileFlags(files);
    return toTesterResult(gameId, expectedGameId, !flags.hasDinput
        && !flags.hasReframework
        && !flags.hasAutorun
        && !flags.hasPlugins
        && !flags.hasNatives
        && flags.hasPak);
}
export function buildMarkerFolderInstructions(pathApi, files, markerFolder, targetPrefix) {
    const instructions = [];
    for (const entry of normalizeEntries(files)) {
        const markerIndex = findSegmentIndex(entry, markerFolder);
        if (markerIndex < 0)
            continue;
        const suffix = entry.segments.slice(markerIndex + 1);
        if (suffix.length === 0)
            continue;
        instructions.push({
            type: 'copy',
            source: entry.source,
            destination: joinPath(pathApi, ...targetPrefix, ...suffix),
        });
    }
    return instructions;
}
export function buildReframeworkSiblingInstructions(pathApi, files) {
    const entries = normalizeEntries(files);
    const roots = new Set();
    for (const entry of entries) {
        const base = entry.segments[entry.segments.length - 1]?.toLowerCase() || '';
        if (base === 'dinput8.dll') {
            roots.add(entry.segments.slice(0, -1).join('/'));
        }
    }
    const instructions = [];
    const seen = new Set();
    for (const root of roots) {
        const rootSegments = root ? root.split('/') : [];
        for (const entry of entries) {
            if (entry.segments.length <= rootSegments.length)
                continue;
            const underRoot = rootSegments.every((segment, index) => entry.segments[index] === segment);
            if (!underRoot)
                continue;
            const relativeSegments = entry.segments.slice(rootSegments.length);
            const key = `${entry.source}\0${relativeSegments.join('/')}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            instructions.push({
                type: 'copy',
                source: entry.source,
                destination: joinPath(pathApi, ...relativeSegments),
            });
        }
    }
    return instructions;
}
export function extractPatchNumber(fileName) {
    const match = /patch_(\d+)\.pak$/iu.exec(fileName);
    return match ? Number(match[1]) || 0 : 0;
}
async function isFile(fsApi, filePath) {
    try {
        const stat = await fsApi.stat(filePath);
        return !!stat.isFile;
    }
    catch {
        return false;
    }
}
export async function getNextReEnginePakIndex(pathApi, fsApi, gameRoot) {
    let entries = [];
    try {
        entries = await fsApi.readdir(gameRoot);
    }
    catch {
        return 1;
    }
    let maxPatch = 0;
    for (const entry of entries) {
        const fullPath = pathApi.join(gameRoot, entry);
        if (!await isFile(fsApi, fullPath))
            continue;
        if (!entry.toLowerCase().endsWith('.pak'))
            continue;
        maxPatch = Math.max(maxPatch, extractPatchNumber(entry));
    }
    return maxPatch + 1;
}
export function createReEnginePakName(index) {
    return `re_chunk_000.pak.patch_${String(index).padStart(3, '0')}.pak`;
}
export function getReEnginePakDeployments(metaInfo) {
    const raw = metaInfo?.reEnginePakDeployments;
    if (!Array.isArray(raw))
        return [];
    return raw
        .map((item) => {
        if (!item || typeof item !== 'object')
            return null;
        const value = item;
        const originalArchivePath = String(value.originalArchivePath || '');
        const deployedFilename = String(value.deployedFilename || '');
        const patchNumber = Number(value.patchNumber || extractPatchNumber(deployedFilename));
        if (!originalArchivePath || !deployedFilename || !Number.isFinite(patchNumber) || patchNumber <= 0)
            return null;
        return {
            engineFamily: 're-engine',
            normalizeGroup: String(value.normalizeGroup || 're_chunk_000.pak'),
            originalArchivePath,
            deployedFilename,
            patchNumber,
        };
    })
        .filter(Boolean);
}
function updateReEnginePakDeployment(deployments, deploymentToUpdate, toFilename, patchNumber) {
    return deployments.map((item) => {
        if (item.normalizeGroup !== deploymentToUpdate.normalizeGroup ||
            item.originalArchivePath !== deploymentToUpdate.originalArchivePath)
            return item;
        return {
            ...item,
            deployedFilename: toFilename,
            patchNumber,
        };
    });
}
export async function buildPakInstructions(pathApi, fsApi, files, gameRoot) {
    let nextIndex = await getNextReEnginePakIndex(pathApi, fsApi, gameRoot);
    const instructions = [];
    const deployments = [];
    for (const entry of normalizeEntries(files)) {
        if (archiveExtName(entry.source) !== '.pak')
            continue;
        const deployedFilename = createReEnginePakName(nextIndex);
        instructions.push({
            type: 'copy',
            source: entry.source,
            destination: deployedFilename,
        });
        deployments.push({
            engineFamily: 're-engine',
            normalizeGroup: 're_chunk_000.pak',
            originalArchivePath: entry.source,
            deployedFilename,
            patchNumber: nextIndex,
        });
        nextIndex += 1;
    }
    return { instructions, deployments };
}
export function installReEngineReframeworkLoader(pathApi, files) {
    return { instructions: buildReframeworkSiblingInstructions(pathApi, files) };
}
export function installReEngineReframework(pathApi, files) {
    return { instructions: buildMarkerFolderInstructions(pathApi, files, 'reframework', ['reframework']) };
}
export function installReEngineAutorun(pathApi, files) {
    return { instructions: buildMarkerFolderInstructions(pathApi, files, 'autorun', ['reframework', 'autorun']) };
}
export function installReEnginePlugins(pathApi, files) {
    return { instructions: buildMarkerFolderInstructions(pathApi, files, 'plugins', ['reframework', 'plugins']) };
}
export function installReEngineNatives(pathApi, files) {
    return { instructions: buildMarkerFolderInstructions(pathApi, files, 'natives', ['natives']) };
}
export async function installReEnginePak(pathApi, fsApi, files, gameRoot) {
    const { instructions, deployments } = await buildPakInstructions(pathApi, fsApi, files, gameRoot);
    return {
        instructions: [
            ...instructions,
            {
                type: 'attribute',
                key: 'reEnginePakDeployments',
                value: deployments,
            },
        ],
    };
}
function normalizeFsComparablePath(input) {
    return String(input || '').replace(/\\/g, '/').toLowerCase();
}
function isManagedGameFile(targetPath, entries) {
    const normalized = normalizeFsComparablePath(targetPath);
    return entries.some((entry) => normalizeFsComparablePath(entry.targetPath) === normalized);
}
function findUnmanagedCollision(filename, mutation, selectedEntries) {
    const expected = filename.toLowerCase();
    for (const file of mutation.gameFiles || []) {
        if (archiveBaseName(file.targetPath).toLowerCase() !== expected)
            continue;
        if (file.managed || isManagedGameFile(file.targetPath, selectedEntries))
            continue;
        return file;
    }
    return null;
}
export function normalizeReEnginePakFiles(pathApi, mutation, options = {}) {
    const normalizeGroup = options.normalizeGroup || 're_chunk_000.pak';
    const records = [];
    for (const entry of mutation.entries) {
        if (options.modType && entry.modType !== options.modType)
            continue;
        if (archiveExtName(entry.targetPath) !== '.pak')
            continue;
        const deployments = getReEnginePakDeployments(entry.metaInfo);
        let currentTargetPath = entry.targetPath;
        let currentName = archiveBaseName(currentTargetPath);
        const originalName = currentName;
        const deployment = deployments.find((item) => item.normalizeGroup === normalizeGroup &&
            item.deployedFilename.toLowerCase() === currentName.toLowerCase())
            || deployments.find((item) => item.normalizeGroup === normalizeGroup &&
                item.deployedFilename.toLowerCase() === originalName.toLowerCase());
        if (!deployment)
            continue;
        if (entry.exists === false && mutation.adoptDeployment) {
            const candidates = (mutation.gameFiles || []).filter((file) => archiveExtName(file.targetPath) === '.pak' &&
                file.hash === entry.expectedHash &&
                !file.managed);
            if (candidates.length === 1) {
                currentTargetPath = candidates[0].targetPath;
                currentName = archiveBaseName(currentTargetPath);
                mutation.adoptDeployment({
                    modKey: entry.modKey,
                    from: entry.targetPath,
                    to: currentTargetPath,
                    expectedHash: entry.expectedHash,
                });
            }
            else {
                mutation.warn?.('RE Engine pak normalize skipped a missing managed pak because no unique same-hash candidate was found.', {
                    target: entry.targetPath,
                    candidates: candidates.length,
                });
                continue;
            }
        }
        const patchNumber = extractPatchNumber(currentName);
        const normalizedEntry = currentTargetPath === entry.targetPath
            ? entry
            : { ...entry, targetPath: currentTargetPath, absolutePath: currentTargetPath, exists: true };
        records.push({
            entry: normalizedEntry,
            deployment,
            patchNumber,
            targetFilename: currentName,
            finalFilename: currentName,
            finalPatchNumber: patchNumber,
        });
    }
    if (records.length === 0)
        return;
    records.sort((a, b) => (a.patchNumber - b.patchNumber) ||
        String(a.entry.modKey).localeCompare(String(b.entry.modKey)) ||
        a.targetFilename.localeCompare(b.targetFilename));
    const selectedEntries = records.map((record) => record.entry);
    for (let index = 0; index < records.length; index += 1) {
        const patchNumber = index + 1;
        const finalFilename = createReEnginePakName(patchNumber);
        const collision = findUnmanagedCollision(finalFilename, mutation, selectedEntries);
        if (collision) {
            mutation.warn?.('RE Engine pak normalize skipped because target patch is occupied by an unmanaged file.', {
                target: finalFilename,
                path: collision.targetPath,
            });
            return;
        }
        records[index].finalFilename = finalFilename;
        records[index].finalPatchNumber = patchNumber;
    }
    const moving = records.filter((record) => record.targetFilename !== record.finalFilename);
    if (moving.length === 0)
        return;
    const nonce = Date.now().toString(36);
    for (let index = 0; index < moving.length; index += 1) {
        const record = moving[index];
        const tempFilename = `.heybox-normalize-${nonce}-${index + 1}.pak`;
        const tempTarget = pathApi.join(mutation.gamePath, tempFilename);
        const finalTarget = pathApi.join(mutation.gamePath, record.finalFilename);
        mutation.moveDeployment({
            modKey: record.entry.modKey,
            from: record.entry.targetPath,
            to: tempTarget,
            expectedHash: record.entry.expectedHash,
        });
        mutation.moveDeployment({
            modKey: record.entry.modKey,
            from: tempTarget,
            to: finalTarget,
            expectedHash: record.entry.expectedHash,
        });
        const deployments = getReEnginePakDeployments(record.entry.metaInfo);
        mutation.setModMetadata({
            modKey: record.entry.modKey,
            patch: {
                reEnginePakDeployments: updateReEnginePakDeployment(deployments, record.deployment, record.finalFilename, record.finalPatchNumber),
            },
        });
    }
}
export function registerReEnginePakNormalizeHook(context, modType) {
    if (typeof context.registerManagedDeploymentHook !== 'function')
        return;
    const phases = ['afterEnable', 'afterDisable', 'afterUninstall'];
    for (const phase of phases) {
        context.registerManagedDeploymentHook(phase, { modType }, async () => {
            const api = context.api;
            if (typeof api?.vfs?.runManagedDeploymentMutation !== 'function')
                return;
            await api.vfs.runManagedDeploymentMutation({
                modType,
                includeCurrentHashes: true,
                includeGameFiles: {
                    directories: ['{gamePath}'],
                    extensions: ['.pak'],
                },
            }, (mutation) => {
                normalizeReEnginePakFiles(context.api.util.path, mutation, { modType });
            });
        });
    }
}
