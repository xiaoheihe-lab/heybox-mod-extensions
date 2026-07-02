export type Instruction = Record<string, unknown>;

export type PatchDeployment = {
  originalArchivePath: string;
  originalFilename: string;
  tempFilename: string;
  deployedFilename: string;
  fileStart: string;
  fileEnd: string;
  isPatchFile?: boolean;
  patchNumber?: number;
};

export type InstallOptions = {
  sourcePathByFile?: Record<string, string>;
  stagingPath?: string;
};

export type ManifestOption = {
  Name?: string;
  Description?: string;
  Image?: string;
  Include?: unknown;
  SubOptions?: ManifestOption[];
  [key: string]: unknown;
};

export type ManifestFile = {
  Guid?: string;
  Name?: string;
  Description?: string;
  Options?: ManifestOption[];
  [key: string]: unknown;
};

export type ManifestSelectionPayload =
  | { kind: 'option'; option: ManifestOption }
  | { kind: 'suboption'; option: ManifestOption; subOption: ManifestOption };

export type ManifestReadResult = {
  manifest: ManifestFile;
  rootPath: string;
  archivePath: string;
};
