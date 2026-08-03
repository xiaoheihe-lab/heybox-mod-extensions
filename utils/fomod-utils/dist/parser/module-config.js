import { normalizeArchivePath } from '../security/paths.js';
import { MAX_OPTIONS } from '../security/xml.js';
import { attr, boolAttr, first, list, text } from './xml-helpers.js';
const OPTION_TYPES = new Set(['Required', 'Recommended', 'Optional', 'NotUsable', 'CouldBeUsable']);
const GROUP_TYPES = new Set(['SelectAny', 'SelectAll', 'SelectExactlyOne', 'SelectAtMostOne', 'SelectAtLeastOne']);
let fileOrder = 0;
function parseOrder(value) {
    const order = String(value || 'Explicit');
    return order === 'Ascending' || order === 'Descending' ? order : 'Explicit';
}
function ordered(items, order) {
    if (order === 'Explicit')
        return items;
    const direction = order === 'Ascending' ? 1 : -1;
    return [...items].sort((a, b) => direction * a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}
function parseDependency(node) {
    if (!node)
        return { kind: 'all', children: [] };
    const children = [];
    for (const item of list(node.fileDependency)) {
        children.push({
            kind: 'file',
            path: normalizeArchivePath(attr(item, 'file')),
            state: attr(item, 'state', 'Active'),
        });
    }
    for (const item of list(node.flagDependency)) {
        children.push({ kind: 'flag', flag: attr(item, 'flag'), value: attr(item, 'value') });
    }
    for (const item of list(node.gameDependency)) {
        children.push({ kind: 'unsupported', feature: `gameDependency ${attr(item, 'version')}` });
    }
    for (const item of list(node.fommDependency)) {
        children.push({ kind: 'unsupported', feature: `fommDependency ${attr(item, 'version')}` });
    }
    for (const item of list(node.dependencies))
        children.push(parseDependency(item));
    return { kind: attr(node, 'operator', 'And') === 'Or' ? 'any' : 'all', children };
}
function parseFiles(node) {
    const output = [];
    for (const kind of ['file', 'folder']) {
        for (const item of list(node?.[kind])) {
            output.push({
                kind,
                source: normalizeArchivePath(attr(item, 'source')),
                destination: normalizeArchivePath(attr(item, 'destination'), true),
                priority: Number(attr(item, 'priority', '0')) || 0,
                alwaysInstall: boolAttr(item, 'alwaysInstall'),
                installIfUsable: boolAttr(item, 'installIfUsable'),
                order: fileOrder++,
            });
        }
    }
    return output;
}
function optionType(value, fallback = 'Optional') {
    const type = String(value || fallback);
    return OPTION_TYPES.has(type) ? type : fallback;
}
function parseTypeDescriptor(node) {
    const direct = first(node?.type);
    if (direct)
        return { defaultType: optionType(attr(direct, 'name')), patterns: [] };
    const dependencyType = first(node?.dependencyType);
    if (!dependencyType)
        return { defaultType: 'Optional', patterns: [] };
    const patterns = list(first(dependencyType.patterns)?.pattern).map((pattern) => ({
        dependency: parseDependency(first(pattern.dependencies)),
        type: optionType(attr(first(pattern.type), 'name')),
    }));
    return {
        defaultType: optionType(attr(first(dependencyType.defaultType), 'name')),
        patterns,
    };
}
function parseOption(node, stepIndex, groupIndex, optionIndex) {
    const flags = {};
    for (const flag of list(first(node.conditionFlags)?.flag))
        flags[attr(flag, 'name')] = text(flag);
    return {
        id: `s${stepIndex}:g${groupIndex}:o${optionIndex}`,
        name: attr(node, 'name', `Option ${optionIndex + 1}`),
        description: text(first(node.description)) || undefined,
        image: attr(first(node.image), 'path') || undefined,
        files: parseFiles(first(node.files)),
        flags,
        type: parseTypeDescriptor(first(node.typeDescriptor)),
    };
}
function parseGroup(node, stepIndex, groupIndex) {
    const rawType = attr(node, 'type', 'SelectAny');
    const options = list(first(node.plugins)?.plugin)
        .map((plugin, optionIndex) => parseOption(plugin, stepIndex, groupIndex, optionIndex));
    return {
        id: `s${stepIndex}:g${groupIndex}`,
        name: attr(node, 'name', `Group ${groupIndex + 1}`),
        type: GROUP_TYPES.has(rawType) ? rawType : 'SelectAny',
        options: ordered(options, parseOrder(attr(first(node.plugins), 'order'))),
    };
}
function parseStep(node, stepIndex) {
    const groupsRoot = first(node.optionalFileGroups);
    const groups = list(groupsRoot?.group).map((group, groupIndex) => parseGroup(group, stepIndex, groupIndex));
    return {
        id: `s${stepIndex}`,
        name: attr(node, 'name', `Step ${stepIndex + 1}`),
        visible: first(node.visible) ? parseDependency(first(node.visible)) : undefined,
        groups: ordered(groups, parseOrder(attr(groupsRoot, 'order'))),
    };
}
function collectDependencyPaths(dependency, output) {
    if (!dependency)
        return;
    if (dependency.kind === 'file' && dependency.path)
        output.add(dependency.path);
    for (const child of dependency.children || [])
        collectDependencyPaths(child, output);
}
export function parseModuleConfig(parsed) {
    fileOrder = 0;
    const config = first(parsed.config);
    if (!config)
        throw new Error('FOMOD ModuleConfig.xml does not contain a config root');
    const stepsRoot = first(config.installSteps);
    const steps = list(stepsRoot?.installStep).map((step, index) => parseStep(step, index));
    const optionCount = steps.reduce((sum, step) => sum + step.groups.reduce((n, group) => n + group.options.length, 0), 0);
    if (optionCount > MAX_OPTIONS)
        throw new Error(`FOMOD contains too many options: ${optionCount}`);
    const conditionalFiles = list(first(config.conditionalFileInstalls)?.patterns?.[0]?.pattern).map((pattern) => ({
        dependency: parseDependency(first(pattern.dependencies)),
        files: parseFiles(first(pattern.files)),
    }));
    const model = {
        moduleName: text(first(config.moduleName), 'FOMOD Installer'),
        moduleImage: attr(first(config.moduleImage), 'path') || undefined,
        moduleDependencies: first(config.moduleDependencies) ? parseDependency(first(config.moduleDependencies)) : undefined,
        requiredFiles: parseFiles(first(config.requiredInstallFiles)),
        steps: ordered(steps, parseOrder(attr(stepsRoot, 'order'))),
        conditionalFiles,
        allFileDependencyPaths: [],
    };
    const paths = new Set();
    collectDependencyPaths(model.moduleDependencies, paths);
    for (const step of model.steps) {
        collectDependencyPaths(step.visible, paths);
        for (const group of step.groups) {
            for (const option of group.options) {
                for (const pattern of option.type.patterns)
                    collectDependencyPaths(pattern.dependency, paths);
            }
        }
    }
    for (const pattern of model.conditionalFiles)
        collectDependencyPaths(pattern.dependency, paths);
    model.allFileDependencyPaths = [...paths];
    return model;
}
