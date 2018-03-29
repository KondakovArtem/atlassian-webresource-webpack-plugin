const flattenReduce = require('./flattenReduce');
const WebpackHelpers = require('./WebpackHelpers');
const WRMHelpers = require('./WRMHelpers');
const baseContexts = require('./settings/base-contexts');

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
     * If more than one chunk is present that means they are commons-chunks that contain code needed by the entrypoint to function.
     * All chunks in the "chunks"-array are in the order they need to be loaded in - therefore the actual entrypoint is always the last in that array.
     * Hence, if we find an entrypoint with more than one chunk, we can assume that every but the last chunk are commons chunks and have to be handled as such.
     *
     * IMPORTANT-NOTE: async-chunks required by this entrypoint are not specified in the entrypoint but as sub-chunks of the entrypoint chunk.
     */
    getCommonsChunks() {
        const entryPoints = [...this.compilation.entrypoints.values()];
        const commonChunks = entryPoints.map(e => e.chunks.filter(c => c !== e.runtimeChunk));

        return Array.from(new Set(commonChunks.reduce(flattenReduce, [])));
    }

    /**
     * Create a key and the fully-qualified web-resource descriptor for every commons-chunk.
     * This is needed to point to reference these chunks as dependency in the entrypoint chunks
     *
     * <web-resource>
     *   ...
     *   <dependency>this-plugin-key:commons_some_chunk</dependency>
     *   ...
     */
    getCommonsChunkDependenciesKeyMap(pluginKey, commonsChunks) {
        const commonsChunkDependencyKeyMap = new Map();
        for (const c of commonsChunks) {
            const chunkIdentifier = WebpackHelpers.getChunkIdentifier(c);
            const webResourceKey = `commons_${chunkIdentifier}`;
            commonsChunkDependencyKeyMap.set(chunkIdentifier, {
                key: webResourceKey,
                dependency: `${pluginKey}:${webResourceKey}`,
            });
        }

        return commonsChunkDependencyKeyMap;
    }

    getCommonsChunksResourceDescriptors() {
        const resourceToAssetMap = WebpackHelpers.extractResourceToAssetMapForCompilation(
            WebpackHelpers.extractAllModulesFromCompilatationAndChildCompilations(this.compilation)
        );

        const commonsChunks = this.getCommonsChunks();
        const commonsChunkDependencyKeyMap = this.getCommonsChunkDependenciesKeyMap(
            this.options.pluginKey,
            commonsChunks
        );

        /**
         * Create descriptors for the commons-chunk web-resources that have to be created.
         * These include - like other chunk-descriptors their assets and external resources etc.
         */
        const commonDescriptors = commonsChunks.map(c => {
            const additionalFileDeps = WebpackHelpers.getDependencyResourcesFromChunk(c, resourceToAssetMap);
            return {
                key: commonsChunkDependencyKeyMap.get(WebpackHelpers.getChunkIdentifier(c)).key,
                externalResources: WebpackHelpers.getExternalResourcesForChunk(c),
                resources: Array.from(new Set(c.files.concat(additionalFileDeps))),
                dependencies: WebpackHelpers.getDependenciesForChunks([c]),
            };
        });

        return commonDescriptors;
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
                dependencies: WebpackHelpers.getDependenciesForChunks([c]),
            };
        });

        return asyncChunkDescriptors;
    }

    getEntryPointsResourceDescriptors() {
        const entrypoints = this.compilation.entrypoints;
        const resourceToAssetMap = WebpackHelpers.extractResourceToAssetMapForCompilation(
            WebpackHelpers.extractAllModulesFromCompilatationAndChildCompilations(this.compilation)
        );

        const commonsChunks = this.getCommonsChunks();
        const commonsChunkDependencyKeyMap = this.getCommonsChunkDependenciesKeyMap(
            this.options.pluginKey,
            commonsChunks
        );

        // Used in prod
        const prodEntryPoints = [...entrypoints].map(([name, entrypoint]) => {
            const webresourceKey = WRMHelpers.getWebresourceKeyForEntry(name, this.options.webresourceKeyMap);
            const entrypointChunks = entrypoint.chunks;
            const runtimeChunk = entrypoint.runtimeChunk;

            // Retrieve all commons-chunk this entrypoint depends on. These must be added as "<dependency>"s to the web-resource of this entrypoint
            const commonDeps = entrypointChunks
                .map(c => commonsChunkDependencyKeyMap.get(WebpackHelpers.getChunkIdentifier(c)))
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
                dependencies: baseContexts.concat(WebpackHelpers.getDependenciesForChunks([runtimeChunk]), commonDeps),
                conditions: WRMHelpers.getConditionForEntry(name, this.options.conditionMap),
            };
        });

        return prodEntryPoints;
    }

    getResourceDescriptors() {
        return this.getCommonsChunksResourceDescriptors()
            .concat(this.getAsyncChunksResourceDescriptors())
            .concat(this.getEntryPointsResourceDescriptors())
            .concat(this.getAssetResourceDescriptor());
    }
};
