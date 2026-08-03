import { findFomodRoot } from '../security/paths.js';
import { assertSafeXml, assertSupportedXmlFeatures } from '../security/xml.js';
import { parseModuleConfig } from '../parser/module-config.js';
import { parseInfoXml } from '../parser/info.js';
import { asFomodError, FomodError } from './errors.js';
import { runFomod } from './run.js';
async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const cryptoApi = globalThis.crypto?.subtle;
    if (cryptoApi) {
        const digest = await cryptoApi.digest('SHA-256', bytes);
        return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    throw new FomodError('FOMOD_UNSUPPORTED_FEATURE', 'SHA-256 is unavailable in the extension runtime');
}
export function isFomodPackage(files) {
    return findFomodRoot(files) !== null;
}
export function registerFomodInstaller(contextValue, options) {
    const context = contextValue;
    const isTargetGame = (gameId) => String(gameId) === String(options.gameId);
    context.registerModType(options.typeId, 1000, isTargetGame, () => '{gamePath}', () => false, {
        name: options.name || 'FOMOD Installer',
    });
    context.registerInstaller(options.typeId, options.priority ?? 100, (files, gameId) => ({
        supported: isTargetGame(gameId) && isFomodPackage(files),
    }), async (files, stagingPath = '', deploymentOptions = {}) => {
        const located = findFomodRoot(files);
        if (!located)
            throw new FomodError('FOMOD_INVALID_CONFIG', 'FOMOD ModuleConfig.xml was not found');
        if (files.some((file) => /(?:^|\/)fomod\/.*\.cs$/i.test(file.replace(/\\/g, '/')))) {
            throw new FomodError('FOMOD_UNSUPPORTED_FEATURE', 'C# scripted FOMOD installers are not supported');
        }
        try {
            const configPhysicalPath = context.api.util.path.join(stagingPath, located.configPath);
            const raw = await context.api.util.fs.readFileAsync(configPhysicalPath, 'utf8');
            const xml = String(raw);
            assertSafeXml(xml);
            assertSupportedXmlFeatures(xml);
            const parsed = await context.api.util.fileParseApi.parseXmlToObject(xml);
            const model = parseModuleConfig(parsed);
            let info;
            const expectedInfoPath = `${located.root ? `${located.root}/` : ''}fomod/info.xml`.toLowerCase();
            const infoPath = files.find((file) => file.replace(/\\/g, '/').toLowerCase() === expectedInfoPath);
            if (infoPath) {
                try {
                    const infoXml = String(await context.api.util.fs.readFileAsync(context.api.util.path.join(stagingPath, infoPath), 'utf8'));
                    assertSafeXml(infoXml);
                    info = parseInfoXml(await context.api.util.fileParseApi.parseXmlToObject(infoXml));
                }
                catch (error) {
                    console.warn('[FOMOD] Failed to read optional info.xml metadata', error);
                }
            }
            const fomodOptions = (deploymentOptions?.fomod || {});
            const result = await runFomod({
                model,
                configHash: await sha256(xml),
                archiveFiles: files,
                packageRoot: located.root,
                stagingPath,
                storedState: fomodOptions.storedState,
                forceInteractive: fomodOptions.mode === 'reconfigure',
                reuseOnly: fomodOptions.mode === 'reuse',
                info,
                api: context.api.util.fomod,
                pathApi: context.api.util.path,
                fsApi: context.api.util.fs,
            });
            return { instructions: result.instructions, modTypeId: options.typeId };
        }
        catch (error) {
            throw asFomodError(error);
        }
    });
}
