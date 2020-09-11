const uniq = require('lodash/uniq');
const flatMap = require('lodash/flatMap');

const {
    getConditionForEntry,
    getDataProvidersForEntry,
    getContextForEntry,
    getWebresourceAttributesForEntry,
} = require('./helpers/web-resource-entrypoints');
const WebpackHelpers = require('./WebpackHelpers');
const { getBaseDependencies } = require('./settings/base-dependencies');

/** @typedef {import("webpack/lib/Chunk")} Chunk */
/** @typedef {import("webpack/lib/Compiler")} Compiler */
/** @typedef {import("webpack/lib/Compilation")} Compilation */
/** @typedef {import("webpack/lib/Entrypoint")} Entrypoint */

const RUNTIME_WR_KEY = 'common-runtime';

module.exports = class AppResources {
    /**
     * @param {String} assetsUUID unique hash to identify the assets web-resource
     * @param {String} xmlDescriptorWebpackPath relative path to the xml file that the WrmPlugin will render
     * @param {Map<String,String>} assetNames full module filepaths -> relative filepath
     * @param {Object} options WrmPlugin configuration
     * @param {Compiler} compiler Webpack compiler
     * @param {Compilation} compilation Webpack compilation
     */
    constructor(assetsUUID, xmlDescriptorWebpackPath, assetNames, options, compiler, compilation) {
        this.assetsUUID = assetsUUID;
        this.xmlDescriptorPath = xmlDescriptorWebpackPath;
        this.assetNames = assetNames;
        this.options = options;
        this.compiler = compiler;
        this.compilation = compilation;
    }

    getSingleRuntimeFiles() {
        return this.getEntryPoints()
            .map(entrypoint => entrypoint.getRuntimeChunk().files)
            .find(Boolean);
    }

    getAssetResourceDescriptor() {
        // remove anything that we know is handled differently
        const assetFiles = Object.keys(this.compilation.assets)
            .filter(p => !/\.(js|css|soy)(\.map)?$/.test(p))
            .filter(p => !p.includes(this.xmlDescriptorPath));

        const assets = {
            attributes: { key: `assets-${this.assetsUUID}` },
            resources: assetFiles,
        };

        return assets;
    }

    getDependencyResourcesFromChunk(chunk) {
        if ('auxiliaryFiles' in chunk) {
            return Array.from(chunk.auxiliaryFiles);
        }
        const resourceToAssetMap = this.assetNames;
        const ownDepsSet = new Set();
        const fileDepsSet = new Set();
        chunk.getModules().forEach(m => {
            ownDepsSet.add(m.resource);
            if (m.buildInfo.fileDependencies) {
                m.buildInfo.fileDependencies.forEach(filepath => fileDepsSet.add(filepath));
            }
        });
        return Array.from(fileDepsSet)
            .filter(filename => resourceToAssetMap.has(filename))
            .filter(filename => !ownDepsSet.has(filename))
            .filter(filename => !/\.(js|css|soy)(\.map)?$/.test(filename))
            .map(dep => resourceToAssetMap.get(dep));
    }

    /**
     * Every entrypoint has an attribute called "chunks".
     * This contains all chunks that are needed to successfully "load" this entrypoint.
     * Usually every entrypoint only contains one chunk - the bundle that is build for that entrypoint.
     * If more than one chunk is present that means they are split-chunks that contain code needed by the entrypoint to function.
     * To get all split chunks we need to get all but the entrypoints "runtimeChunk" which is the chunk solely containing code for this entrypoint and its runtime.
     *
     * IMPORTANT-NOTE: async-chunks required by this entrypoint are not specified in these chunks but in the childGroups of the entry and/or split chunks.
     */
    getSyncSplitChunks() {
        const syncSplitChunks = flatMap(this.getEntryPoints(), e => e.chunks.filter(c => c !== e.getRuntimeChunk()));

        return uniq(syncSplitChunks);
    }

    /**
     * Create a key and the fully-qualified web-resource descriptor for every split chunk.
     * This is needed to point to reference these chunks as dependency in the entrypoint chunks
     *
     * <web-resource>
     *   ...
     *   <dependency>this-plugin-key:split_some_chunk</dependency>
     *   ...
     * </web-resource>
     * @param {Set<Chunk>} syncSplitChunks
     */
    getSyncSplitChunkDependenciesKeyMap(syncSplitChunks) {
        const syncSplitChunkDependencyKeyMap = new Map();

        for (const c of syncSplitChunks) {
            const webResourceKey = `split_${c.name || c.id}`;
            syncSplitChunkDependencyKeyMap.set(c, {
                key: webResourceKey,
                dependency: `${this.options.pluginKey}:${webResourceKey}`,
            });
        }

        return syncSplitChunkDependencyKeyMap;
    }

    getSyncSplitChunksResourceDescriptors() {
        const syncSplitChunks = this.getSyncSplitChunks();
        const syncSplitChunkDependencyKeyMap = this.getSyncSplitChunkDependenciesKeyMap(syncSplitChunks);

        /**
         * Create descriptors for the split chunk web-resources that have to be created.
         * These include - like other chunk-descriptors their assets and external resources etc.
         */
        const sharedSplitDescriptors = syncSplitChunks.map(c => {
            const additionalFileDeps = this.getDependencyResourcesFromChunk(c);
            return {
                attributes: syncSplitChunkDependencyKeyMap.get(c),
                externalResources: WebpackHelpers.getExternalResourcesForChunk(c),
                resources: uniq([...c.files, ...additionalFileDeps]),
                dependencies: uniq([...getBaseDependencies(), ...WebpackHelpers.getDependenciesForChunks(c)]),
            };
        });

        return sharedSplitDescriptors;
    }

    getAsyncChunksResourceDescriptors() {
        const asyncChunkDescriptors = WebpackHelpers.getAllAsyncChunks(this.getEntryPoints()).map(c => {
            const additionalFileDeps = this.getDependencyResourcesFromChunk(c);
            return {
                attributes: { key: `${c.id}` },
                externalResources: WebpackHelpers.getExternalResourcesForChunk(c),
                resources: uniq([...c.files, ...additionalFileDeps]),
                dependencies: uniq([...getBaseDependencies(), ...WebpackHelpers.getDependenciesForChunks(c)]),
                contexts: this.options.addAsyncNameAsContext && c.name ? [`async-chunk-${c.name}`] : undefined,
            };
        });

        return asyncChunkDescriptors;
    }

    getEntryPoints() {
        return Array.from(this.compilation.entrypoints.values());
    }

    getEntryPointsResourceDescriptors() {
        const singleRuntime = WebpackHelpers.isSingleRuntime(this.compiler);

        const syncSplitChunks = this.getSyncSplitChunks();
        const syncSplitChunkDependencyKeyMap = this.getSyncSplitChunkDependenciesKeyMap(syncSplitChunks);

        const singleRuntimeWebResourceKey = this.options.singleRuntimeWebResourceKey || RUNTIME_WR_KEY;

        // Used in prod
        const prodEntryPoints = this.getEntryPoints().map(entrypoint => {
            const name = entrypoint.name;
            const webResourceAttrs = getWebresourceAttributesForEntry(name, this.options.webresourceKeyMap);
            const entrypointChunks = entrypoint.chunks;
            const runtimeChunk = entrypoint.getRuntimeChunk();

            // Retrieve all split chunks this entrypoint depends on. These must be added as "<dependency>"s to the web-resource of this entrypoint
            const sharedSplitDeps = entrypointChunks
                .map(c => syncSplitChunkDependencyKeyMap.get(c))
                .filter(Boolean)
                .map(val => val.dependency);

            // Construct the list of resources to add to this web-resource
            const resourceList = flatMap(entrypointChunks, c => this.getDependencyResourcesFromChunk(c));

            const dependencyList = [
                ...getBaseDependencies(),
                ...WebpackHelpers.getDependenciesForChunks(runtimeChunk),
                ...sharedSplitDeps,
            ];

            if (singleRuntime) {
                dependencyList.unshift(`${this.options.pluginKey}:${singleRuntimeWebResourceKey}`);
            } else {
                resourceList.unshift(...runtimeChunk.files);
            }

            return {
                attributes: webResourceAttrs,
                contexts: getContextForEntry(name, this.options.contextMap, this.options.addEntrypointNameAsContext),
                conditions: getConditionForEntry(name, this.options.conditionMap),
                dataProviders: getDataProvidersForEntry(name, this.options.dataProvidersMap),
                externalResources: WebpackHelpers.getExternalResourcesForChunk(runtimeChunk),
                resources: uniq(resourceList),
                dependencies: uniq(dependencyList),
            };
        });

        if (singleRuntime) {
            prodEntryPoints.push({
                attributes: { key: singleRuntimeWebResourceKey },
                dependencies: getBaseDependencies(),
                resources: this.getSingleRuntimeFiles(),
            });
        }

        return prodEntryPoints;
    }

    getResourceDescriptors() {
        return []
            .concat(this.getSyncSplitChunksResourceDescriptors())
            .concat(this.getAsyncChunksResourceDescriptors())
            .concat(this.getEntryPointsResourceDescriptors())
            .concat(this.getAssetResourceDescriptor());
    }
};
