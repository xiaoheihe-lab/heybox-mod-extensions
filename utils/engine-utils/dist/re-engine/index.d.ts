import type { IExtensionContext } from 'heybox-mod-api';
export type CopyInstruction = {
    type: 'copy';
    source: string;
    destination: string;
};
export type AttributeInstruction = {
    type: 'attribute';
    key: string;
    value: unknown;
};
export type InstallInstruction = CopyInstruction | AttributeInstruction;
export type InstallerResult = {
    instructions: InstallInstruction[];
    modType?: string;
    modTypeId?: string;
};
type FileEntry = {
    source: string;
    segments: string[];
};
type PathApi = IExtensionContext['api']['util']['path'];
type FsApi = IExtensionContext['api']['util']['fs'];
type TesterResult = {
    supported: boolean;
    requiredFiles: string[];
};
export type ReEnginePakDeployment = {
    engineFamily: 're-engine';
    normalizeGroup: string;
    originalArchivePath: string;
    deployedFilename: string;
    patchNumber: number;
};
export type ManagedDeploymentEntry = {
    modKey: string;
    modId?: number;
    fileId?: number;
    versionId?: number;
    modType?: string;
    targetPath: string;
    absolutePath: string;
    expectedHash: string;
    currentHash?: string | null;
    exists?: boolean;
    metaInfo?: Record<string, unknown>;
};
export type ManagedDeploymentGameFile = {
    targetPath: string;
    absolutePath: string;
    hash?: string | null;
    exists?: boolean;
    managed?: boolean;
};
export type ManagedDeploymentMutation = {
    gamePath: string;
    entries: ManagedDeploymentEntry[];
    gameFiles?: ManagedDeploymentGameFile[];
    moveDeployment(input: {
        modKey: string;
        from: string;
        to: string;
        expectedHash?: string;
    }): void;
    adoptDeployment?(input: {
        modKey: string;
        from: string;
        to: string;
        expectedHash?: string;
    }): void;
    setModMetadata(input: {
        modKey: string;
        patch: Record<string, unknown>;
    }): void;
    warn?(message: string, details?: Record<string, unknown>): void;
};
export type ManagedDeploymentHookPhase = 'afterEnable' | 'afterDisable' | 'afterUninstall';
type ManagedDeploymentHookRegistrar = IExtensionContext & {
    registerManagedDeploymentHook?: (phase: ManagedDeploymentHookPhase, options: {
        modType?: string;
    }, callback: (payload: Record<string, unknown>) => unknown | Promise<unknown>) => void;
};
export declare function normalizeArchivePath(filePath: string): string | null;
export declare function normalizeEntries(files: string[]): FileEntry[];
export declare function archiveBaseName(filePath: string): string;
export declare function archiveExtName(filePath: string): string;
export declare function testReEngineReframeworkLoader(files: string[], gameId: number | string, expectedGameId: number): TesterResult;
export declare function testReEngineReframework(files: string[], gameId: number | string, expectedGameId: number): TesterResult;
export declare function testReEngineAutorun(files: string[], gameId: number | string, expectedGameId: number): TesterResult;
export declare function testReEnginePlugins(files: string[], gameId: number | string, expectedGameId: number): TesterResult;
export declare function testReEngineNatives(files: string[], gameId: number | string, expectedGameId: number): TesterResult;
export declare function testReEnginePak(files: string[], gameId: number | string, expectedGameId: number): TesterResult;
export declare function buildMarkerFolderInstructions(pathApi: PathApi, files: string[], markerFolder: string, targetPrefix: string[]): CopyInstruction[];
export declare function buildReframeworkSiblingInstructions(pathApi: PathApi, files: string[]): CopyInstruction[];
export declare function extractPatchNumber(fileName: string): number;
export declare function getNextReEnginePakIndex(pathApi: PathApi, fsApi: FsApi, gameRoot: string): Promise<number>;
export declare function createReEnginePakName(index: number): string;
export declare function getReEnginePakDeployments(metaInfo: Record<string, unknown> | undefined): ReEnginePakDeployment[];
export declare function buildPakInstructions(pathApi: PathApi, fsApi: FsApi, files: string[], gameRoot: string): Promise<{
    instructions: CopyInstruction[];
    deployments: ReEnginePakDeployment[];
}>;
export declare function installReEngineReframeworkLoader(pathApi: PathApi, files: string[]): InstallerResult;
export declare function installReEngineReframework(pathApi: PathApi, files: string[]): InstallerResult;
export declare function installReEngineAutorun(pathApi: PathApi, files: string[]): InstallerResult;
export declare function installReEnginePlugins(pathApi: PathApi, files: string[]): InstallerResult;
export declare function installReEngineNatives(pathApi: PathApi, files: string[]): InstallerResult;
export declare function installReEnginePak(pathApi: PathApi, fsApi: FsApi, files: string[], gameRoot: string): Promise<InstallerResult>;
export declare function normalizeReEnginePakFiles(pathApi: PathApi, mutation: ManagedDeploymentMutation, options?: {
    modType?: string;
    normalizeGroup?: string;
}): void;
export declare function registerReEnginePakNormalizeHook(context: ManagedDeploymentHookRegistrar, modType: string): void;
export {};
