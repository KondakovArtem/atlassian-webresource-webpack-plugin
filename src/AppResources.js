const flattenReduce = require('./flattenReduce');
const WebpackHelpers = require('./WebpackHelpers');
const WRMHelpers = require('./WRMHelpers');
const { getBaseContexts } = require('./settings/base-contexts');

module.exports = class AppResources {
    constructor(assetUUID, options, compiler, compilation) {
        this.assetUUID = assetUUID;
        this.options = options;
        this.compiler = compiler;
        this.compilation = compilation;
    }

    getAssetResourceDescriptor() {
        const assetFiles = Object.keys(this.compilation.assets).filter(p => !/\.(js|css|soy)(\.map)?$/.test(p)); // remove anything that we know is handled differently

        const assets = {
            key: `assets-${this.assetUUID}`,
            resources: assetFiles,
        };

        return assets;
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
        const entryPoints = [...this.compilation.entrypoints.values()];
        const syncSplitChunks = entryPoints.map(e => e.chunks.filter(c => c !== e.runtimeChunk));

        return Array.from(new Set(syncSplitChunks.reduce(flattenReduce, [])));
    }

    /**
     * Create a key and the fully-qualified web-resource descriptor for every split chunk.
     * This is needed to point to reference these chunks as dependency in the entrypoint chunks
     *
     * <web-resource>
     *   ...
     *   <dependency>this-plugin-key:split_some_chunk</dependency>
     *   ...
     */
    getSyncSplitChunkDependenciesKeyMap(pluginKey, syncSplitChunks) {
        const syncSplitChunkDependencyKeyMap = new Map();
        for (const c of syncSplitChunks) {
            const chunkIdentifier = WebpackHelpers.getChunkIdentifier(c);
            const webResourceKey = `split_${chunkIdentifier}`;
            syncSplitChunkDependencyKeyMap.set(chunkIdentifier, {
                key: webResourceKey,
                dependency: `${pluginKey}:${webResourceKey}`,
            });
        }

        return syncSplitChunkDependencyKeyMap;
    }

    getSyncSplitChunksResourceDescriptors() {
        const resourceToAssetMap = WebpackHelpers.extractResourceToAssetMapForCompilation(
            WebpackHelpers.extractAllModulesFromCompilatationAndChildCompilations(this.compilation)
        );

        const syncSplitChunks = this.getSyncSplitChunks();
        const syncSplitChunkDependencyKeyMap = this.getSyncSplitChunkDependenciesKeyMap(
            this.options.pluginKey,
            syncSplitChunks
        );

        /**
         * Create descriptors for the split chunk web-resources that have to be created.
         * These include - like other chunk-descriptors their assets and external resources etc.
         */
        const sharedSplitDescriptors = syncSplitChunks.map(c => {
            const additionalFileDeps = WebpackHelpers.getDependencyResourcesFromChunk(c, resourceToAssetMap);
            return {
                key: syncSplitChunkDependencyKeyMap.get(WebpackHelpers.getChunkIdentifier(c)).key,
                externalResources: WebpackHelpers.getExternalResourcesForChunk(c),
                resources: Array.from(new Set(c.files.concat(additionalFileDeps))),
                dependencies: getBaseContexts().concat(WebpackHelpers.getDependenciesForChunks([c])),
            };
        });

        return sharedSplitDescriptors;
    }

    getAsyncChunksResourceDescriptors() {
        const entryPoints = [...this.compilation.entrypoints.values()];
        const resourceToAssetMap = WebpackHelpers.extractResourceToAssetMapForCompilation(
            WebpackHelpers.extractAllModulesFromCompilatationAndChildCompilations(this.compilation)
        );

        const asyncChunkDescriptors = WebpackHelpers.getAllAsyncChunks(entryPoints).map(c => {
            const additionalFileDeps = WebpackHelpers.getDependencyResourcesFromChunk(c, resourceToAssetMap);
            return {
                key: `${c.id}`,
                externalResources: WebpackHelpers.getExternalResourcesForChunk(c),
                resources: Array.from(new Set(c.files.concat(additionalFileDeps))),
                dependencies: getBaseContexts().concat(WebpackHelpers.getDependenciesForChunks([c])),
            };
        });

        return asyncChunkDescriptors;
    }

    getEntryPointsResourceDescriptors() {
        const entrypoints = this.compilation.entrypoints;
        const resourceToAssetMap = WebpackHelpers.extractResourceToAssetMapForCompilation(
            WebpackHelpers.extractAllModulesFromCompilatationAndChildCompilations(this.compilation)
        );

        const syncSplitChunks = this.getSyncSplitChunks();
        const syncSplitChunkDependencyKeyMap = this.getSyncSplitChunkDependenciesKeyMap(
            this.options.pluginKey,
            syncSplitChunks
        );

        // Used in prod
        const prodEntryPoints = [...entrypoints].map(([name, entrypoint]) => {
            const webresourceKey = WRMHelpers.getWebresourceKeyForEntry(name, this.options.webresourceKeyMap);
            const entrypointChunks = entrypoint.chunks;
            const runtimeChunk = entrypoint.runtimeChunk;

            // Retrieve all split chunks this entrypoint depends on. These must be added as "<dependency>"s to the web-resource of this entrypoint
            const sharedSplitDeps = entrypointChunks
                .map(c => syncSplitChunkDependencyKeyMap.get(WebpackHelpers.getChunkIdentifier(c)))
                .filter(Boolean)
                .map(val => val.dependency);

            const additionalFileDeps = entrypointChunks.map(c =>
                WebpackHelpers.getDependencyResourcesFromChunk(c, resourceToAssetMap)
            );
            return {
                key: webresourceKey,
                contexts: WRMHelpers.getContextForEntry(name, this.options.contextMap),
                externalResources: WebpackHelpers.getExternalResourcesForChunk(runtimeChunk),
                resources: Array.from(new Set([].concat(runtimeChunk.files, ...additionalFileDeps))),
                dependencies: getBaseContexts().concat(
                    WebpackHelpers.getDependenciesForChunks([runtimeChunk]),
                    sharedSplitDeps
                ),
                conditions: WRMHelpers.getConditionForEntry(name, this.options.conditionMap),
            };
        });

        return prodEntryPoints;
    }

    getResourceDescriptors() {
        return this.getSyncSplitChunksResourceDescriptors()
            .concat(this.getAsyncChunksResourceDescriptors())
            .concat(this.getEntryPointsResourceDescriptors())
            .concat(this.getAssetResourceDescriptor());
    }
};
