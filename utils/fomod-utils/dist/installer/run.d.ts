import type { FomodModel } from '../model/types.js';
import type { FomodApi, FomodStoredState } from '../protocol/types.js';
import { type CopyInstruction } from './files.js';
import type { FomodInfoMetadata } from '../parser/info.js';
interface RunOptions {
    model: FomodModel;
    configHash: string;
    archiveFiles: string[];
    packageRoot: string;
    stagingPath: string;
    storedState?: FomodStoredState;
    forceInteractive: boolean;
    reuseOnly?: boolean;
    info?: FomodInfoMetadata;
    api: FomodApi;
    pathApi: {
        join(...parts: unknown[]): string;
    };
    fsApi: {
        readFileAsync(path: unknown): Promise<string | Buffer>;
    };
}
export declare function runFomod(options: RunOptions): Promise<{
    instructions: Array<CopyInstruction | {
        type: 'attribute';
        key: 'fomod';
        value: FomodStoredState;
    }>;
    state: FomodStoredState;
}>;
export {};
