import type { FomodGroupType, FomodOptionType } from '../protocol/types.js';
export type Order = 'Explicit' | 'Ascending' | 'Descending';
export interface Dependency {
    kind: 'all' | 'any' | 'file' | 'flag' | 'unsupported';
    children?: Dependency[];
    path?: string;
    state?: 'Active' | 'Inactive' | 'Missing';
    flag?: string;
    value?: string;
    feature?: string;
}
export interface FileItem {
    kind: 'file' | 'folder';
    source: string;
    destination: string;
    priority: number;
    alwaysInstall: boolean;
    installIfUsable: boolean;
    order: number;
}
export interface TypeDescriptor {
    defaultType: FomodOptionType;
    patterns: Array<{
        dependency: Dependency;
        type: FomodOptionType;
    }>;
}
export interface Option {
    id: string;
    name: string;
    description?: string;
    image?: string;
    files: FileItem[];
    flags: Record<string, string>;
    type: TypeDescriptor;
}
export interface Group {
    id: string;
    name: string;
    type: FomodGroupType;
    options: Option[];
}
export interface Step {
    id: string;
    name: string;
    visible?: Dependency;
    groups: Group[];
}
export interface FomodModel {
    moduleName: string;
    moduleImage?: string;
    moduleDependencies?: Dependency;
    requiredFiles: FileItem[];
    steps: Step[];
    conditionalFiles: Array<{
        dependency: Dependency;
        files: FileItem[];
    }>;
    allFileDependencyPaths: string[];
}
