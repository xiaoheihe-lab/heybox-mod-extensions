export function defaultSelections(group, optionTypes) {
    const usable = group.options.filter((option) => optionTypes[option.id] !== 'NotUsable');
    const required = usable.filter((option) => optionTypes[option.id] === 'Required').map((option) => option.id);
    if (group.type === 'SelectAll')
        return usable.map((option) => option.id);
    if (group.type === 'SelectExactlyOne') {
        const preferred = usable.find((option) => optionTypes[option.id] === 'Recommended') || usable[0];
        return preferred ? [preferred.id] : [];
    }
    return [...new Set([...required, ...usable.filter((option) => optionTypes[option.id] === 'Recommended').map((option) => option.id)])];
}
export function validateStepSelections(step, selectedIds, optionTypes) {
    const selected = new Set(selectedIds);
    const result = {};
    for (const group of step.groups) {
        const valid = group.options
            .filter((option) => selected.has(option.id) && optionTypes[option.id] !== 'NotUsable')
            .map((option) => option.id);
        for (const option of group.options) {
            if (optionTypes[option.id] === 'Required' && !valid.includes(option.id))
                valid.push(option.id);
        }
        const usableCount = group.options.filter((option) => optionTypes[option.id] !== 'NotUsable').length;
        if (group.type === 'SelectExactlyOne' && valid.length !== 1)
            throw new Error(`${group.name}: select exactly one option`);
        if (group.type === 'SelectAtMostOne' && valid.length > 1)
            throw new Error(`${group.name}: select at most one option`);
        if (group.type === 'SelectAtLeastOne' && valid.length < 1 && usableCount > 0)
            throw new Error(`${group.name}: select at least one option`);
        if (group.type === 'SelectAll' && valid.length !== usableCount)
            throw new Error(`${group.name}: all usable options are required`);
        result[group.id] = valid;
    }
    return result;
}
