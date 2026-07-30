import { first, text } from './xml-helpers.js';
export function parseInfoXml(parsed) {
    const root = first(parsed.fomod || parsed.Fomod || parsed.fomodInfo || Object.values(parsed)[0]);
    if (!root || typeof root !== 'object')
        return {};
    return {
        name: text(first(root.Name || root.name)) || undefined,
        author: text(first(root.Author || root.author)) || undefined,
        version: text(first(root.Version || root.version)) || undefined,
        website: text(first(root.Website || root.website)) || undefined,
    };
}
