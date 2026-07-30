export function evaluateDependency(dependency, state) {
    if (!dependency)
        return true;
    switch (dependency.kind) {
        case 'all': return (dependency.children || []).every((child) => evaluateDependency(child, state));
        case 'any': return (dependency.children || []).some((child) => evaluateDependency(child, state));
        case 'flag': return state.flags[dependency.flag || ''] === String(dependency.value ?? '');
        case 'file': {
            const expected = dependency.state || 'Active';
            if (expected === 'Inactive') {
                const error = new Error('Unsupported FOMOD feature: fileDependency Inactive state');
                error.code = 'FOMOD_UNSUPPORTED_FEATURE';
                throw error;
            }
            return (state.files[dependency.path || ''] || 'Missing') === expected;
        }
        case 'unsupported': {
            const error = new Error(`Unsupported FOMOD feature: ${dependency.feature || 'unknown dependency'}`);
            error.code = 'FOMOD_UNSUPPORTED_FEATURE';
            throw error;
        }
    }
}
export function resolveOptionType(descriptor, state) {
    for (const pattern of descriptor.patterns) {
        if (evaluateDependency(pattern.dependency, state))
            return pattern.type;
    }
    return descriptor.defaultType;
}
