export function normalizeArchivePath(input: string): string {
  return String(input || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/^(\.\/)+/, '');
}

export function isDirectoryEntry(file: string): boolean {
  return /[\\/]$/.test(String(file || ''));
}

export function pathParts(input: string): string[] {
  return normalizeArchivePath(input).split('/').filter(Boolean);
}

export function archiveBasename(input: string): string {
  const parts = pathParts(input);
  return parts[parts.length - 1] || '';
}

export function archiveDirname(input: string): string {
  const parts = pathParts(input);
  parts.pop();
  return parts.join('/');
}

export function archiveExtname(input: string): string {
  const name = archiveBasename(input);
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index).toLowerCase() : '';
}

export function archiveJoin(...parts: string[]): string {
  return parts.map(normalizeArchivePath).filter(Boolean).join('/');
}

export function getRootRelativeDestination(file: string, rootPath: string): string {
  const normalized = normalizeArchivePath(file);
  const root = normalizeArchivePath(rootPath);
  return root && normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : archiveBasename(normalized);
}

export function filterUnderRoot(files: string[], rootPath: string): string[] {
  const root = normalizeArchivePath(rootPath);
  return files.filter((file) => {
    const normalized = normalizeArchivePath(file);
    return !isDirectoryEntry(file) && (!root || normalized === root || normalized.startsWith(`${root}/`));
  });
}

export function basenameFromPath(filePath: string): string {
  return String(filePath || '').replace(/\\/g, '/').split('/').filter(Boolean).pop() || '';
}

export function replacePathBasename(filePath: string, filename: string): string {
  return String(filePath || '').replace(/[^\\/]+$/, filename);
}

export function uniqueFiles(files: string[]): string[] {
  return Array.from(new Set(files.map(normalizeArchivePath))).filter(Boolean);
}
