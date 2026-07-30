import type { Dependency, TypeDescriptor } from '../model/types.js'
import type { FomodOptionType } from '../protocol/types.js'

export interface EvaluationState {
  flags: Record<string, string>
  files: Record<string, 'Active' | 'Missing'>
}

export function evaluateDependency(dependency: Dependency | undefined, state: EvaluationState): boolean {
  if (!dependency) return true
  switch (dependency.kind) {
    case 'all': return (dependency.children || []).every((child) => evaluateDependency(child, state))
    case 'any': return (dependency.children || []).some((child) => evaluateDependency(child, state))
    case 'flag': return state.flags[dependency.flag || ''] === String(dependency.value ?? '')
    case 'file': {
      const expected = dependency.state || 'Active'
      if (expected === 'Inactive') {
        const error = new Error('Unsupported FOMOD feature: fileDependency Inactive state') as Error & { code?: string }
        error.code = 'FOMOD_UNSUPPORTED_FEATURE'
        throw error
      }
      return (state.files[dependency.path || ''] || 'Missing') === expected
    }
    case 'unsupported': {
      const error = new Error(`Unsupported FOMOD feature: ${dependency.feature || 'unknown dependency'}`) as Error & { code?: string }
      error.code = 'FOMOD_UNSUPPORTED_FEATURE'
      throw error
    }
  }
}

export function resolveOptionType(descriptor: TypeDescriptor, state: EvaluationState): FomodOptionType {
  for (const pattern of descriptor.patterns) {
    if (evaluateDependency(pattern.dependency, state)) return pattern.type
  }
  return descriptor.defaultType
}
