import { evaluateDependency, resolveOptionType } from '../evaluator/dependencies.js';
import { defaultSelections, validateStepSelections } from '../evaluator/selection.js';
import { expandFileItems } from './files.js';
import { FomodError } from './errors.js';
import { loadImageDataUrl } from './images.js';
function flattenSelections(selections) {
    return new Set(Object.values(selections).flat());
}
function replayState(model, selections, files, throughStepIndex = model.steps.length - 1) {
    const state = { flags: {}, files };
    const selected = flattenSelections(selections);
    for (const step of model.steps.slice(0, throughStepIndex + 1)) {
        for (const group of step.groups) {
            for (const option of group.options) {
                if (selected.has(option.id))
                    Object.assign(state.flags, option.flags);
            }
        }
    }
    return state;
}
function optionTypes(step, state) {
    return Object.fromEntries(step.groups.flatMap((group) => group.options.map((option) => [option.id, resolveOptionType(option.type, state)])));
}
function isStoredSelectionValid(model, stored, files) {
    try {
        const state = { flags: {}, files };
        if (!evaluateDependency(model.moduleDependencies, state))
            return false;
        for (const step of model.steps) {
            if (!evaluateDependency(step.visible, state)) {
                if ((stored.selections[step.id] || []).length > 0)
                    return false;
                continue;
            }
            const knownIds = new Set(step.groups.flatMap((group) => group.options.map((option) => option.id)));
            if ((stored.selections[step.id] || []).some((id) => !knownIds.has(id)))
                return false;
            validateStepSelections(step, stored.selections[step.id] || [], optionTypes(step, state));
            const selected = new Set(stored.selections[step.id] || []);
            for (const group of step.groups) {
                for (const option of group.options) {
                    if (selected.has(option.id))
                        Object.assign(state.flags, option.flags);
                }
            }
        }
        return true;
    }
    catch {
        return false;
    }
}
async function buildUiGroups(step, selectedIds, types, options) {
    return Promise.all(step.groups.map(async (group) => ({
        id: group.id,
        name: group.name,
        type: group.type,
        options: await Promise.all(group.options.map(async (option) => ({
            id: option.id,
            name: option.name,
            description: option.description,
            imageDataUrl: await loadImageDataUrl(option.image, options.packageRoot, options.stagingPath, options.pathApi, options.fsApi),
            type: types[option.id],
            selected: selectedIds.has(option.id),
            disabled: types[option.id] === 'Required' || types[option.id] === 'NotUsable' || group.type === 'SelectAll',
        }))),
    })));
}
function selectedOptions(model, selections) {
    const selected = flattenSelections(selections);
    return model.steps.flatMap((step) => step.groups.flatMap((group) => group.options.filter((option) => selected.has(option.id))));
}
function collectInstallFiles(model, selections, state) {
    const output = [...model.requiredFiles];
    const selected = flattenSelections(selections);
    for (const step of model.steps) {
        for (const group of step.groups) {
            for (const option of group.options) {
                const type = resolveOptionType(option.type, state);
                const includeOption = selected.has(option.id);
                for (const file of option.files) {
                    if (includeOption || file.alwaysInstall || (file.installIfUsable && type !== 'NotUsable'))
                        output.push(file);
                }
            }
        }
    }
    for (const conditional of model.conditionalFiles) {
        if (evaluateDependency(conditional.dependency, state))
            output.push(...conditional.files);
    }
    return output;
}
export async function runFomod(options) {
    const dependencyResult = await options.api.resolveFileDependencies(options.model.allFileDependencyPaths);
    const files = dependencyResult?.states || {};
    let selections = {};
    const stored = options.storedState;
    const hasMatchingStoredState = stored?.schemaVersion === 1
        && stored.protocolVersion === '1.0'
        && stored.configHash === options.configHash;
    const canReuse = Boolean(hasMatchingStoredState && (options.reuseOnly || isStoredSelectionValid(options.model, stored, files)));
    if (options.reuseOnly && !canReuse) {
        throw new FomodError('FOMOD_INVALID_CONFIG', 'A compatible saved FOMOD selection is required for silent reuse');
    }
    if (canReuse)
        selections = Object.fromEntries(Object.entries(stored.selections).map(([key, value]) => [key, [...value]]));
    let sessionId;
    if (!canReuse || options.forceInteractive) {
        sessionId = `fomod:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        const moduleImageDataUrl = await loadImageDataUrl(options.model.moduleImage, options.packageRoot, options.stagingPath, options.pathApi, options.fsApi);
        let cursor = 0;
        try {
            while (cursor < options.model.steps.length) {
                const state = replayState(options.model, selections, files, cursor - 1);
                if (!evaluateDependency(options.model.moduleDependencies, state))
                    throw new FomodError('FOMOD_INVALID_CONFIG', 'FOMOD module dependencies are not satisfied');
                const step = options.model.steps[cursor];
                if (!evaluateDependency(step.visible, state)) {
                    delete selections[step.id];
                    cursor += 1;
                    continue;
                }
                const types = optionTypes(step, state);
                const existing = selections[step.id]
                    || step.groups.flatMap((group) => defaultSelections(group, types));
                const projectedSelections = { ...selections, [step.id]: existing };
                const projectedState = replayState(options.model, projectedSelections, files, cursor);
                const response = await options.api.requestStep({
                    sessionId,
                    moduleName: options.model.moduleName === 'FOMOD Installer' && options.info?.name
                        ? options.info.name
                        : options.model.moduleName,
                    moduleAuthor: options.info?.author,
                    moduleVersion: options.info?.version,
                    moduleWebsite: options.info?.website,
                    moduleImageDataUrl,
                    stepId: step.id,
                    stepName: step.name,
                    stepIndex: cursor,
                    totalSteps: options.model.steps.length,
                    canGoBack: options.model.steps.slice(0, cursor).some((candidate, index) => evaluateDependency(candidate.visible, replayState(options.model, selections, files, index - 1))),
                    isLastStep: options.model.steps.slice(cursor + 1).every((candidate) => !evaluateDependency(candidate.visible, projectedState)),
                    groups: await buildUiGroups(step, new Set(existing), types, options),
                });
                if (response.action === 'cancel')
                    throw new FomodError('FOMOD_INSTALL_CANCELLED', 'FOMOD installation was cancelled');
                if (response.action === 'back') {
                    delete selections[step.id];
                    let previous = cursor - 1;
                    while (previous > 0) {
                        const candidate = options.model.steps[previous];
                        const candidateState = replayState(options.model, selections, files, previous - 1);
                        if (evaluateDependency(candidate.visible, candidateState))
                            break;
                        delete selections[candidate.id];
                        previous -= 1;
                    }
                    cursor = Math.max(0, previous);
                    continue;
                }
                const validated = validateStepSelections(step, response.selectedOptionIds || [], types);
                selections[step.id] = Object.values(validated).flat();
                for (const later of options.model.steps.slice(cursor + 1))
                    delete selections[later.id];
                cursor += 1;
            }
        }
        catch (error) {
            await options.api.closeSession({ sessionId, status: error?.code === 'FOMOD_INSTALL_CANCELLED' ? 'cancelled' : 'failed', message: String(error?.message || error) });
            throw error;
        }
    }
    const finalState = replayState(options.model, selections, files);
    for (const option of selectedOptions(options.model, selections))
        Object.assign(finalState.flags, option.flags);
    const selected = flattenSelections(selections);
    const groupSelections = Object.fromEntries(options.model.steps.flatMap((step) => step.groups.map((group) => [
        group.id,
        group.options.filter((option) => selected.has(option.id)).map((option) => option.id),
    ])));
    const state = {
        schemaVersion: 1,
        protocolVersion: '1.0',
        configHash: options.configHash,
        selections,
        groupSelections,
    };
    const instructions = [
        ...expandFileItems(collectInstallFiles(options.model, selections, finalState), options.archiveFiles, options.packageRoot),
        { type: 'attribute', key: 'fomod', value: state },
    ];
    if (sessionId)
        await options.api.closeSession({ sessionId, status: 'completed' });
    return { instructions, state };
}
