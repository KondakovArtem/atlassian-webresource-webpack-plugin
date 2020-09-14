const glob = require('glob');
const path = require('path');
const uniq = require('lodash/uniq');
const PrettyData = require('pretty-data').pd;

const { extractPathPrefixForXml } = require('./helpers/options-parser');
const { getWebresourceAttributesForEntry } = require('./helpers/web-resource-entrypoints');
const { renderWebResource } = require('./helpers/web-resource-generator');
const { renderElement } = require('./helpers/xml');
const { webpack5or4 } = require('./helpers/conditional-logic');
const WrmDependencyModule = require('./webpack-modules/WrmDependencyModule');
const WrmResourceModule = require('./webpack-modules/WrmResourceModule');
const WebpackHelpers = require('./WebpackHelpers');
const WebpackRuntimeHelpers = require('./WebpackRuntimeHelpers');
const logger = require('./logger');

/** @typedef {import("webpack/lib/Compiler")} Compiler */
/** @typedef {import("webpack/lib/Compilation")} Compilation */
/** @typedef {import("webpack/lib/Entrypoint")} Entrypoint */

const RESOURCE_JOINER = '__RESOURCE__JOINER__';

module.exports = class QUnitTestResourcesPlugin {
    constructor({ assetsUUID, testGlobs, outputPath, transformationMap, webresourceKeyMap }) {
        this.testGlobs = testGlobs;
        this.transformationMap = transformationMap;
        this.webresourceKeyMap = webresourceKeyMap;
        this.qunitRequireMockPath = `qunit-require-shim-${assetsUUID}.js`;
        this.outputPath = outputPath;
    }

    /**
     * @param {Compiler} compiler
     */
    apply(compiler) {
        // hacky, but meh.
        this.context = compiler.options.context;

        compiler.hooks.compilation.tap('qunit plugin - inject shim', compilation => {
            // inject QUnit shim file
            const qUnitRequireMock = require('./shims/qunit-require-shim');
            compilation.assets[this.qunitRequireMockPath] = {
                source: () => Buffer.from(qUnitRequireMock),
                size: () => Buffer.byteLength(qUnitRequireMock),
            };
        });

        // Process source files used in this compilation and write out
        // xml descriptors to power QUnit tests.
        WebpackRuntimeHelpers.hookIntoAssetAnalysisStage(
            'qunit plugin - generate descriptors',
            compiler,
            (compilation, callback) => {
                const testResourceDescriptors = this.createTestResourceDescriptors(compilation);
                const qUnitTestResourceDescriptors = this.createQUnitResourceDescriptors();
                const webResources = [...testResourceDescriptors, ...qUnitTestResourceDescriptors];

                const xmlDescriptors = PrettyData.xml(`<bundles>${webResources.join('')}</bundles>`);

                compilation.assets[this.outputPath] = {
                    source: () => Buffer.from(xmlDescriptors),
                    size: () => Buffer.byteLength(xmlDescriptors),
                };

                callback();
            }
        );
    }

    createTestResourceDescriptors(compilation) {
        const jsonTestDescriptors = this.createAllFileTestWebResources(compilation);
        return jsonTestDescriptors.map(descriptor => renderWebResource(descriptor, this.transformationMap));
    }

    createQUnitResourceDescriptors() {
        const qUnitTestFiles = this.getTestedFiles();
        return qUnitTestFiles.map(filepath =>
            renderElement('resource', { type: 'qunit', name: filepath, location: filepath })
        );
    }

    /**
     * @param {Compilation} compilation
     */
    createAllFileTestWebResources(compilation) {
        return [...compilation.entrypoints.entries()].map(([name, entryPoint]) => {
            const webResourceAttrs = getWebresourceAttributesForEntry(name, this.webresourceKeyMap);
            const allEntryPointChunks = [...entryPoint.chunks, ...WebpackHelpers.getAllAsyncChunks([entryPoint])];

            const testFiles = this.extractAllFilesFromChunks(compilation, allEntryPointChunks)
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

            const testDependencies = WebpackHelpers.getDependenciesForChunks(allEntryPointChunks);
            return {
                attributes: { key: `__test__${webResourceAttrs.key}`, name: webResourceAttrs.name },
                externalResources: testFiles,
                dependencies: testDependencies,
            };
        });
    }

    /**
     * get all source files whose contents contributed to a chunk.
     * this is a "sledgehammer approach" to avoid having to create an entry point per qunit tests and building it via webpack.
     * it is not cheap. maybe it could be made cheaper...
     * @param {Compilation} compilation
     * @param {Chunk[]} chunks
     */
    extractAllFilesFromChunks(compilation, chunks) {
        const { context } = this;
        const dependencyTreeSet = new Set();
        const circularDepCheck = new Set();

        const extractModule = dep => {
            return webpack5or4(
                () => compilation.moduleGraph.getModule(dep),
                () => dep.module || dep.originModule
            );
        };

        // only include actual, local files (no 3rd party or "virtual" modules)
        const allowed = resourcename => {
            return resourcename && !resourcename.includes('node_modules');
        };

        // add relative paths of allowed files
        const maybeAddFile = filepath => {
            if (allowed(filepath)) {
                const relpath = path.relative(context, filepath);
                dependencyTreeSet.add(relpath);
            }
        };

        const addModule = mod => {
            if (circularDepCheck.has(mod)) {
                logger.warn(`
*********************************************************************************
Circular dependency detected.
The module ${mod.userRequest}/${mod.resource} is involved in a circular dependency.
This might be worth looking into as it could be an issue.
*********************************************************************************

`);
                return;
            }
            circularDepCheck.add(mod);

            // ignore "wr-dependency!" declarations.
            if (mod instanceof WrmDependencyModule) {
                return;
            }

            // handle imports of resources through "wr-resource!..."-syntax
            if (mod instanceof WrmResourceModule) {
                dependencyTreeSet.add(mod.getResourcePair().join(RESOURCE_JOINER));
                return;
            }

            // add this module itself.
            maybeAddFile(mod.userRequest);

            // pull file dependencies directly from the build info
            if (mod.buildInfo && mod.buildInfo.fileDependencies) {
                mod.buildInfo.fileDependencies.forEach(maybeAddFile);
            }

            // recurse in to concatenated modules' source modules
            if (mod.modules) {
                mod.modules.forEach(addModule);
            }

            // recurse in to a module's dependencies, primarily to find any
            // transitive wr-dependency! calls.
            if (mod.dependencies) {
                mod.dependencies
                    .map(extractModule)
                    .filter(m => m && (allowed(m.resource) || m instanceof WrmResourceModule))
                    .forEach(addModule); // recursively add modules own dependencies
            }
        };

        for (const chunk of chunks) {
            for (const mod of chunk.getModules()) {
                addModule(mod);
            }
        }

        return Array.from(dependencyTreeSet);
    }

    getTestedFiles() {
        const { context, testGlobs } = this;

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
                const uniqueFiles = uniq(files);
                files.length = 0; // prevent further iteration ??MAGNETS??
                return uniqueFiles;
            })
            .map(file => path.relative(context, file)); // make them relative to the context
    }
};
