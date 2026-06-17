import type { IExtensionContext } from 'heybox-mod-api';
export type CopyInstruction = {
    type: 'copy';
    source: string;
    destination: string;
};
export type InstallerResult = {
    instructions: CopyInstruction[];
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
export declare function buildPakInstructions(pathApi: PathApi, fsApi: FsApi, files: string[], gameRoot: string): Promise<CopyInstruction[]>;
export declare function installReEngineReframeworkLoader(pathApi: PathApi, files: string[]): InstallerResult;
export declare function installReEngineReframework(pathApi: PathApi, files: string[]): InstallerResult;
export declare function installReEngineAutorun(pathApi: PathApi, files: string[]): InstallerResult;
export declare function installReEnginePlugins(pathApi: PathApi, files: string[]): InstallerResult;
export declare function installReEngineNatives(pathApi: PathApi, files: string[]): InstallerResult;
export declare function installReEnginePak(pathApi: PathApi, fsApi: FsApi, files: string[], gameRoot: string): Promise<InstallerResult>;
export {};
