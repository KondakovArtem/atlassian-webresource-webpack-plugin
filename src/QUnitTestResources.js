const glob = require('glob');
const path = require('path');

const { extractPathPrefixForXml } = require('./helpers/options-parser');
const { getWebresourceAttributesForEntry } = require('./helpers/web-resource-entrypoints');
const { webpack5or4 } = require('./helpers/conditional-logic');
const logger = require('./logger');
const qUnitRequireMock = require('./shims/qunit-require-shim');
const WebpackHelpers = require('./WebpackHelpers');
const WrmDependencyModule = require('./webpack-modules/WrmDependencyModule');
const WrmResourceModule = require('./webpack-modules/WrmResourceModule');

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

            const testFiles = Array.from(this.extractAllFilesFromChunks(allEntryPointChunks))
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

    // get all source files whose contents contributed to a chunk.
    // this is a "sledgehammer approach" to avoid having to create an entry point per qunit tests and building it via webpack.
    // it is not cheap. maybe it could be made cheaper...
    extractAllFilesFromChunks(chunks) {
        const { compilation } = this;
        const { context } = this.compiler.options;
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
                    .filter(Boolean)
                    .filter(m => {
                        if (allowed(m.resource)) {
                            return true;
                        }
                        // include WrmResourceModules
                        if (m instanceof WrmResourceModule) {
                            return true;
                        }
                        // ignore the rest
                        return false;
                    })
                    .forEach(addModule); // recursively add modules own dependencies
            }
        };

        for (const chunk of chunks) {
            for (const mod of chunk.getModules()) {
                addModule(mod);
            }
        }

        return dependencyTreeSet;
    }

    injectQUnitShim() {
        this.compilation.assets[this.qunitRequireMockPath] = {
            source: () => Buffer.from(qUnitRequireMock),
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
