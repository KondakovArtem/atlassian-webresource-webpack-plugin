const path = require('path');

const ProvidedExternalDependencyModule = require('./webpack-modules/ProvidedExternalDependencyModule');
const WrmDependencyModule = require('./webpack-modules/WrmDependencyModule');
const WrmResourceModule = require('./webpack-modules/WrmResourceModule');

const logger = require('./logger');
const flattenReduce = require('./flattenReduce');

module.exports = class WebpackHelpers {
    static getChunksWithEntrypointName(entrypointNames, allChunks) {
        const entryPoints = Object.keys(entrypointNames).map(key => allChunks.find(c => c.name === key));

        const getAllChunks = chunks => {
            if (!chunks) {
                return [];
            }
            return chunks.map(c => getAllChunks(c.chunks).concat(c)).reduce(flattenReduce, []);
        };

        // get all async chunks "deep"
        const allAsyncChunks = entryPoints.map(e => getAllChunks(e.chunks)).reduce(flattenReduce, []);

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

    // find all dependencies defined in the specified chunks
    // needed to build a web-resource for qunit tests
    static extractAllDependenciesFromChunk(chunks) {
        let dependencyTreeSet = new Set();
        for (const chunk of chunks) {
            // filter out "runtime" chunk
            if (chunk.getModules().length > 0) {
                const subChunkSet = WebpackHelpers.extractAllDependenciesFromChunk(chunk.chunks);
                dependencyTreeSet = new Set([...dependencyTreeSet, ...subChunkSet]);
            }
        }
        dependencyTreeSet = new Set([...dependencyTreeSet, ...WebpackHelpers.getDependenciesForChunks(chunks)]);
        return dependencyTreeSet;
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
                .map(d => d.module)
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
            // make sure only the files for this entrypoint end up in the test-files chunk
            if (chunk.getModules().length > 0) {
                const subchunkSet = WebpackHelpers.extractAllFilesFromChunks(chunk.chunks, context, RESOURCE_JOINER);
                dependencyTreeSet = new Set([...dependencyTreeSet, ...subchunkSet]);
            }

            for (const mod of chunk.modules) {
                addModule(mod, dependencyTreeSet);
            }
        }
        return dependencyTreeSet;
    }
};
