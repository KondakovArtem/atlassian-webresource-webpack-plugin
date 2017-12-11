const glob = require('glob');
const path = require('path');

const logger = require('./logger');
const qUnitRequireMock = require('./shims/qunit-require-shim');
const WebpackHelpers = require('./WebpackHelpers');
const WRMHelpers = require('./WRMHelpers');

const RESOURCE_JOINER = '__RESOURCE__JOINER__';
module.exports = class QUnitTestResources {
    constructor(assetUUID, options, compiler, compilation) {
        this.options = options;
        this.compiler = compiler;
        this.compilation = compilation;
        this.qunitRequireMockPath = `qunit-require-shim-${assetUUID}.js`;
    }

    createAllFileTestWebResources() {
        const entryPointNames = this.compilation.entrypoints;

        return Object.keys(entryPointNames).map(name => {
            const webresourceKey = WRMHelpers.getWebresourceKeyForEntry(name, this.options.webresourceKeyMap);
            const entrypointChunks = entryPointNames[name].chunks;
            const actualEntrypointChunk = entrypointChunks[entrypointChunks.length - 1];

            const extractedTestResources = Array.from(
                WebpackHelpers.extractAllFilesFromChunks(
                    [actualEntrypointChunk],
                    this.compiler.options.context,
                    RESOURCE_JOINER
                )
            ).map(resource => {
                if (resource.includes(RESOURCE_JOINER)) {
                    return resource.split(RESOURCE_JOINER);
                }
                return [resource, resource];
            });
            const pathPrefix = WRMHelpers.extractPathPrefixForXml(this.compiler.options);
            const testFiles = [
                [`${pathPrefix}${this.qunitRequireMockPath}`, `${pathPrefix}${this.qunitRequireMockPath}`], // require mock to allow imports like "wr-dependency!context"
            ].concat(extractedTestResources);
            const testDependencies = Array.from(WebpackHelpers.extractAllDependenciesFromChunk(entrypointChunks));
            return {
                key: `__test__${webresourceKey}`,
                externalResources: testFiles,
                dependencies: testDependencies,
            };
        });
    }

    injectQUnitShim() {
        this.compilation.assets[this.qunitRequireMockPath] = {
            source: () => new Buffer(qUnitRequireMock),
            size: () => Buffer.byteLength(qUnitRequireMock),
        };
    }

    getTestFiles() {
        const context = this.compiler.options.context;
        const testGlobs = this.options.__testGlobs__;

        if (!testGlobs) {
            return [];
        }

        logger.warn(`
******************************************************************************
The option "__testGlobs__" is only available to allow migrating old code. Consider
this option deprecated and try to migrate your code to a proper JS-Testrunner.
******************************************************************************
`);
        return testGlobs
            .map(g => glob.sync(g, { absolute: true })) // get all matching files
            .reduce((_, _v, _i, files) => {
                // flatten them and make them unique
                const uniqueFiles = new Set([].concat(...files));
                files.length = 0; // prevent further iteration ??MAGNETS??
                return Array.from(uniqueFiles);
            })
            .map(file => path.relative(context, file)); // make them relative to the context
    }
};
