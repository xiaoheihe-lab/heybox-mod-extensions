import type { Group, Step } from '../model/types.js';
import type { FomodOptionType } from '../protocol/types.js';
export declare function defaultSelections(group: Group, optionTypes: Record<string, FomodOptionType>): string[];
export declare function validateStepSelections(step: Step, selectedIds: string[], optionTypes: Record<string, FomodOptionType>): Record<string, string[]>;
