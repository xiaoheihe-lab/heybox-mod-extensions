import { joinArchivePath, normalizeArchivePath } from '../security/paths.js';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_BY_EXT = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
};
export async function loadImageDataUrl(imagePath, packageRoot, stagingPath, pathApi, fsApi) {
    if (!imagePath)
        return undefined;
    try {
        const relative = joinArchivePath(packageRoot, normalizeArchivePath(imagePath));
        const ext = relative.split('.').pop()?.toLowerCase() || '';
        const mime = MIME_BY_EXT[ext];
        if (!mime)
            return undefined;
        const content = await fsApi.readFileAsync(pathApi.join(stagingPath, relative));
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        if (buffer.length > MAX_IMAGE_BYTES)
            return undefined;
        return `data:${mime};base64,${buffer.toString('base64')}`;
    }
    catch {
        return undefined;
    }
}
