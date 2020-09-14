const { webpack5or4 } = require('./helpers/conditional-logic');
const { buildProvidedDependency } = require('./deps/provided-dependencies');
const { getLibraryDetails } = require('./WebpackHelpers');
const WebpackRuntimeHelpers = require('./WebpackRuntimeHelpers');
const logger = require('./logger');

/** @typedef {import("webpack/lib/Compiler")} Compiler */
/** @typedef {import("webpack/lib/Compilation")} Compilation */

class WrmManifestPlugin {
    constructor({ appResourcesFactory, outputPath, pluginKey }) {
        this.pluginKey = pluginKey;
        this.appResourcesFactory = appResourcesFactory;
        this.outputPath = outputPath;
    }

    /**
     * @param {Compiler} compiler
     */
    apply(compiler) {
        const { outputPath, appResourcesFactory, pluginKey } = this;
        let { name, target } = getLibraryDetails(compiler);
        if (!name || !target) {
            logger.error('Can only use wrmManifestPath in conjunction with output.library and output.libraryTarget');
            return;
        }

        if (target !== 'amd') {
            logger.error(`Could not create manifest mapping. LibraryTarget '${target}' is not supported. Use 'amd'`);
            return;
        }

        WebpackRuntimeHelpers.hookIntoAssetAnalysisStage(
            'wrm manifest - generate deps',
            compiler,
            (compilation, cb) => {
                const appResourceGenerator = appResourcesFactory.build(compiler, compilation);
                const wrmManifestMapping = appResourceGenerator
                    .getEntryPointsResourceDescriptors()
                    .filter(({ attributes }) => attributes.moduleId)
                    .reduce((result, { attributes: { key: resourceKey, moduleId } }) => {
                        const getAssetPath = webpack5or4(
                            () => (name, opts) => compilation.getAssetPath(name, opts),
                            () => (name, opts) => compilation.mainTemplate.getAssetPath(name, opts)
                        );
                        const libraryName = getAssetPath(name, { chunk: { name: moduleId } });

                        result[moduleId] = buildProvidedDependency(
                            pluginKey,
                            resourceKey,
                            `require('${libraryName}')`,
                            libraryName
                        );

                        return result;
                    }, {});

                const wrmManifestJSON = JSON.stringify({ providedDependencies: wrmManifestMapping }, null, 4);

                compilation.assets[outputPath] = {
                    source: () => Buffer.from(wrmManifestJSON),
                    size: () => Buffer.byteLength(wrmManifestJSON),
                };

                cb();
            }
        );
    }
}

module.exports = WrmManifestPlugin;
