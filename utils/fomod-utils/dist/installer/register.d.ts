import type { IExtensionContext } from 'heybox-mod-api';
export interface RegisterFomodInstallerOptions {
    gameId: number | string;
    typeId: string;
    priority?: number;
    name?: string;
}
export declare function isFomodPackage(files: string[]): boolean;
export declare function registerFomodInstaller(contextValue: IExtensionContext, options: RegisterFomodInstallerOptions): void;
