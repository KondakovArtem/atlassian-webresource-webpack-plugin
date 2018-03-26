const path = require('path');

const ProvidedExternalDependencyModule = require('./webpack-modules/ProvidedExternalDependencyModule');
const WrmDependencyModule = require('./webpack-modules/WrmDependencyModule');
const WrmResourceModule = require('./webpack-modules/WrmResourceModule');

const logger = require('./logger');
const flattenReduce = require('./flattenReduce');

module.exports = class WebpackHelpers {
    static getAllAsyncChunks(entryPoints) {
        const seenChunkGroups = new Set();
        const recursivelyGetAllAsyncChunks = chunkGroups => {
            if (!chunkGroups.length === 0) {
                return [];
            }

            return chunkGroups
                .filter(cg => {
                    // circuit breaker
                    // dont use a chunk group more than once
                    const alreadySeen = seenChunkGroups.has(cg);
                    seenChunkGroups.has(cg);
                    return !alreadySeen;
                })
                .map(cg => [...cg.chunks, ...recursivelyGetAllAsyncChunks(cg.getChildren())])
                .reduce(flattenReduce, []);
        };

        // get all async chunks "deep"
        const allAsyncChunks = entryPoints
            .map(e => recursivelyGetAllAsyncChunks(e.getChildren()))
            .reduce(flattenReduce, []);

        // dedupe
        return Array.from(new Set(allAsyncChunks));
    }

    static _getExternalResourceModules(chunk) {
        return chunk
            .getModules()
            .filter(m => m instanceof WrmResourceModule)
            .map(m => m.getResourcePair());
    }

    static getExternalResourcesForChunk(chunk) {
        const externalResources = new Set();

        for (const dep of WebpackHelpers._getExternalResourceModules(chunk)) {
            externalResources.add(dep);
        }
        return Array.from(externalResources);
    }

    static _getExternalDependencyModules(chunk) {
        return chunk
            .getModules()
            .filter(m => {
                return m instanceof ProvidedExternalDependencyModule || m instanceof WrmDependencyModule;
            })
            .map(m => m.getDependency());
    }

    static getDependenciesForChunks(chunks) {
        const externalDeps = new Set();
        for (const chunk of chunks) {
            for (const dep of WebpackHelpers._getExternalDependencyModules(chunk)) {
                externalDeps.add(dep);
            }
        }
        return Array.from(externalDeps);
    }

    static extractAdditionalAssetsFromChunk(chunk) {
        const ownDeps = chunk.getModules().map(m => m.resource);
        const ownDepsSet = new Set(ownDeps);
        const fileDeps = chunk
            .getModules()
            .filter(m => m.buildInfo.fileDependencies)
            .map(m => [...m.buildInfo.fileDependencies])
            .reduce(flattenReduce, []);
        const fileDepsSet = new Set(fileDeps);
        return Array.from(fileDepsSet).filter(
            filename => !ownDepsSet.has(filename) && !/\.(js|css|soy)(\.map)?$/.test(filename)
        );
    }

    static extractAllModulesFromCompilatationAndChildCompilations(compilation) {
        function extractAllModules(compilations) {
            if (compilations.length === 0) {
                return [];
            }

            return compilations.map(c => [...c.modules, ...extractAllModules(c.children)]).reduce(flattenReduce, []);
        }

        return Array.from(new Set(extractAllModules([compilation])));
    }

    static extractResourceToAssetMapForCompilation(compilationModules) {
        return compilationModules
            .filter(m => m.resource && m.buildInfo.assets) // is an actual asset thingy
            .map(m => [m.resource, Object.keys(m.buildInfo.assets)[0]])
            .reduce((set, [resource, asset]) => {
                set.set(resource, asset);
                return set;
            }, new Map());
    }

    static getDependencyResourcesFromChunk(chunk, resourceToAssetMap) {
        const deps = WebpackHelpers.extractAdditionalAssetsFromChunk(chunk);
        return deps.filter(dep => resourceToAssetMap.has(dep)).map(dep => resourceToAssetMap.get(dep));
    }

    // get all files used in a chunk
    // this is needed to create a web-resource that can be used by qunit tests.
    // this is a "sledgehammer approach" to avoid having to create an entry point per qunit tests and building it via webpack.
    static extractAllFilesFromChunks(chunks, context, RESOURCE_JOINER) {
        const circularDepCheck = new Set();
        const addModule = (mod, container) => {
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

            mod.dependencies
                .map(d => d.module || d.originModule)
                .filter(Boolean)
                .filter(m => {
                    // filter out all "virtual" modules that do not reference an actual file (or a wrm web-resource)
                    if (m.resource) {
                        return true;
                    }
                    if (m instanceof WrmResourceModule) {
                        return true;
                    }
                    return false;
                })

                .filter(actualModule => !actualModule.resource || !actualModule.resource.includes('node_modules')) // if it references a file remove it if it comes from "node_modules"
                .forEach(localModule => addModule(localModule, container)); // recursively add modules own dependencies first

            if (mod.resource && !mod.resource.includes('node_modules')) {
                const reference = path.relative(context, mod.resource);
                container.add(reference);
            }

            // handle imports of resources through "wr-resource!..."-syntax
            if (mod instanceof WrmResourceModule) {
                container.add(mod.getResourcePair().join(RESOURCE_JOINER));
            }
        };

        let dependencyTreeSet = new Set();
        for (const chunk of chunks) {
            for (const mod of chunk.getModules()) {
                addModule(mod, dependencyTreeSet);
            }
        }
        return dependencyTreeSet;
    }
};
