const glob = require('glob');
const path = require('path');

const { extractPathPrefixForXml } = require('./helpers/options-parser');
const { getWebresourceAttributesForEntry } = require('./helpers/web-resource-entrypoints');
const logger = require('./logger');
const qUnitRequireMock = require('./shims/qunit-require-shim');
const WebpackHelpers = require('./WebpackHelpers');

const RESOURCE_JOINER = '__RESOURCE__JOINER__';
module.exports = class QUnitTestResources {
    constructor(assetsUUID, options, compiler, compilation) {
        this.options = options;
        this.compiler = compiler;
        this.compilation = compilation;
        this.qunitRequireMockPath = `qunit-require-shim-${assetsUUID}.js`;
    }

    createAllFileTestWebResources() {
        return [...this.compilation.entrypoints.entries()].map(([name, entryPoint]) => {
            const webResourceAttrs = getWebresourceAttributesForEntry(name, this.options.webresourceKeyMap);
            const allEntryPointChunks = [...entryPoint.chunks, ...WebpackHelpers.getAllAsyncChunks([entryPoint])];

            const testFiles = Array.from(
                WebpackHelpers.extractAllFilesFromChunks(
                    allEntryPointChunks,
                    this.compiler.options.context,
                    RESOURCE_JOINER
                )
            )
                .map(resource => {
                    if (resource.includes(RESOURCE_JOINER)) {
                        return resource.split(RESOURCE_JOINER);
                    }
                    return [resource, resource];
                })
                .map(resourcePair => {
                    return { name: resourcePair[0], location: resourcePair[1] };
                });

            // require mock to allow imports like "wr-dependency!context"
            const pathPrefix = extractPathPrefixForXml('');
            testFiles.unshift({
                name: `${pathPrefix}${this.qunitRequireMockPath}`,
                location: `${pathPrefix}${this.qunitRequireMockPath}`,
            });

            const testDependencies = Array.from(WebpackHelpers.getDependenciesForChunks(allEntryPointChunks));
            return {
                attributes: { key: `__test__${webResourceAttrs.key}`, name: webResourceAttrs.name },
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
