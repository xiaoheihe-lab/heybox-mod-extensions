export declare function loadImageDataUrl(imagePath: string | undefined, packageRoot: string, stagingPath: string, pathApi: {
    join(...parts: unknown[]): string;
}, fsApi: {
    readFileAsync(path: unknown): Promise<string | Buffer>;
}): Promise<string | undefined>;
