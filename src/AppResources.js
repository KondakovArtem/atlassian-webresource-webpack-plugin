const {
    getConditionForEntry,
    getContextForEntry,
    getWebresourceAttributesForEntry,
} = require('./helpers/web-resource-entrypoints');
const flattenReduce = require('./flattenReduce');
const WebpackHelpers = require('./WebpackHelpers');
const { getBaseContexts } = require('./settings/base-contexts');

const RUNTIME_WR_KEY = 'common-runtime';

module.exports = class AppResources {
    constructor(assetsUUID, assetNames, options, compiler, compilation) {
        this.assetsUUID = assetsUUID;
        this.assetNames = assetNames;
        this.options = options;
        this.compiler = compiler;
        this.compilation = compilation;
    }

    isSingleRuntime() {
        const options = this.compiler.options;
        const runtimeChunkCfg = options.optimization && options.optimization.runtimeChunk;
        return runtimeChunkCfg && runtimeChunkCfg.name && typeof runtimeChunkCfg.name === 'string';
    }

    getSingleRuntimeChunkName() {
        return this.compiler.options.optimization.runtimeChunk.name;
    }

    getAssetResourceDescriptor() {
        const assetFiles = Object.keys(this.compilation.assets).filter(p => !/\.(js|css|soy)(\.map)?$/.test(p)); // remove anything that we know is handled differently

        const assets = {
            attributes: { key: `assets-${this.assetsUUID}` },
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
        const resourceToAssetMap = this.assetNames;

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
                attributes: syncSplitChunkDependencyKeyMap.get(WebpackHelpers.getChunkIdentifier(c)),
                externalResources: WebpackHelpers.getExternalResourcesForChunk(c),
                resources: Array.from(new Set(c.files.concat(additionalFileDeps))),
                dependencies: getBaseContexts().concat(WebpackHelpers.getDependenciesForChunks([c])),
            };
        });

        return sharedSplitDescriptors;
    }

    getAsyncChunksResourceDescriptors() {
        const entryPoints = [...this.compilation.entrypoints.values()];
        const resourceToAssetMap = this.assetNames;

        const asyncChunkDescriptors = WebpackHelpers.getAllAsyncChunks(entryPoints).map(c => {
            const additionalFileDeps = WebpackHelpers.getDependencyResourcesFromChunk(c, resourceToAssetMap);
            return {
                attributes: { key: `${c.id}` },
                externalResources: WebpackHelpers.getExternalResourcesForChunk(c),
                resources: Array.from(new Set(c.files.concat(additionalFileDeps))),
                dependencies: getBaseContexts().concat(WebpackHelpers.getDependenciesForChunks([c])),
            };
        });

        return asyncChunkDescriptors;
    }

    getEntryPointsResourceDescriptors() {
        const entrypoints = this.compilation.entrypoints;
        const resourceToAssetMap = this.assetNames;

        const syncSplitChunks = this.getSyncSplitChunks();
        const syncSplitChunkDependencyKeyMap = this.getSyncSplitChunkDependenciesKeyMap(
            this.options.pluginKey,
            syncSplitChunks
        );

        // Used in prod
        const prodEntryPoints = [...entrypoints].map(([name, entrypoint]) => {
            const webResourceAttrs = getWebresourceAttributesForEntry(name, this.options.webresourceKeyMap);
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
            // Construct the list of resources to add to this web-resource
            const resourceList = [].concat(...additionalFileDeps);
            const dependencyList = [].concat(
                getBaseContexts(),
                WebpackHelpers.getDependenciesForChunks([runtimeChunk]),
                sharedSplitDeps
            );

            if (this.isSingleRuntime()) {
                dependencyList.unshift(`${this.options.pluginKey}:${RUNTIME_WR_KEY}`);
            } else {
                resourceList.unshift(...runtimeChunk.files);
            }

            return {
                attributes: webResourceAttrs,
                contexts: getContextForEntry(name, this.options.contextMap),
                conditions: getConditionForEntry(name, this.options.conditionMap),
                externalResources: WebpackHelpers.getExternalResourcesForChunk(runtimeChunk),
                resources: Array.from(new Set(resourceList)),
                dependencies: Array.from(new Set(dependencyList)),
            };
        });

        if (this.isSingleRuntime()) {
            const runtimeName = `${this.getSingleRuntimeChunkName()}.js`;
            prodEntryPoints.push({
                attributes: { key: RUNTIME_WR_KEY },
                dependencies: getBaseContexts(),
                resources: [runtimeName],
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
