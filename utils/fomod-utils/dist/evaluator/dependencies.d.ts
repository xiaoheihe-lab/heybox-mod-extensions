import type { Dependency, TypeDescriptor } from '../model/types.js';
import type { FomodOptionType } from '../protocol/types.js';
export interface EvaluationState {
    flags: Record<string, string>;
    files: Record<string, 'Active' | 'Missing'>;
}
export declare function evaluateDependency(dependency: Dependency | undefined, state: EvaluationState): boolean;
export declare function resolveOptionType(descriptor: TypeDescriptor, state: EvaluationState): FomodOptionType;
