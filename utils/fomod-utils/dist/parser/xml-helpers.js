export function list(value) {
    if (value === undefined || value === null)
        return [];
    return Array.isArray(value) ? value : [value];
}
export function first(value) {
    return list(value)[0];
}
export function attr(node, name, fallback = '') {
    return String(node?.$?.[name] ?? fallback);
}
export function text(node, fallback = '') {
    if (typeof node === 'string' || typeof node === 'number')
        return String(node);
    return String(node?._ ?? fallback).trim();
}
export function boolAttr(node, name) {
    return attr(node, name, 'false').toLowerCase() === 'true';
}
