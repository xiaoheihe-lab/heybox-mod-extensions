import type { FileItem } from '../model/types.js';
export interface CopyInstruction {
    type: 'copy';
    source: string;
    destination: string;
    verification: 'exists';
    conflictPolicy: 'overwrite';
}
export declare function expandFileItems(items: FileItem[], archiveFiles: string[], packageRoot: string): CopyInstruction[];
