const ProvidedExternalDependencyModule = require('./webpack-modules/ProvidedExternalDependencyModule');
const WrmDependencyModule = require('./webpack-modules/WrmDependencyModule');
const WrmResourceModule = require('./webpack-modules/WrmResourceModule');

const flattenReduce = require('./flattenReduce');

/** @typedef {import("webpack/lib/Compiler")} Compiler */
/** @typedef {import("webpack/lib/Entrypoint")} Entrypoint */

module.exports = class WebpackHelpers {
    /**
     * @param {Entrypoint[]} entryPoints
     */
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
                    seenChunkGroups.add(cg);
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
            .map(m => m.getResource());
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
            .sort((a, b) => a.index - b.index)
            .map(m => m.getDependency());
    }

    /**
     * @param {Chunk|Chunk[]} val
     * @return {String[]}
     */
    static getDependenciesForChunks(val) {
        const chunks = [].concat(val);
        const externalDeps = new Set();
        for (const chunk of chunks) {
            for (const dep of WebpackHelpers._getExternalDependencyModules(chunk)) {
                externalDeps.add(dep);
            }
            // TODO: figure out how to pass this "properly" as a module
            if (chunk.needsWrmRequire) {
                externalDeps.add('com.atlassian.plugins.atlassian-plugins-webresource-rest:web-resource-manager');
            }
        }
        return Array.from(externalDeps);
    }

    static getChunkIdentifier(chunk) {
        return chunk.name || chunk.id;
    }

    /**
     * Checks if webpack compiler is running in production mode
     *
     * @param   {Compiler} compiler Webpack compiler
     * @returns {Boolean} true if webpack is running in production mode, false otherwise
     */
    static isRunningInProductionMode(compiler) {
        const { mode } = compiler.options;

        return mode === 'production' || (mode === 'none' && process.env.NODE_ENV === 'production');
    }

    /**
     * @param {Compiler} compiler Webpack compiler
     * @returns true if the compiler is configured to output a single runtime chunk, false otherwise.
     */
    static isSingleRuntime(compiler) {
        const { options } = compiler;
        const runtimeChunkCfg = options.optimization && options.optimization.runtimeChunk;
        if (runtimeChunkCfg) {
            if (runtimeChunkCfg === 'single') {
                return true;
            }
            const { name } = runtimeChunkCfg;
            if (typeof name === 'string') {
                return true;
            }
            if (typeof name === 'function') {
                const resultA = name({ name: 'foo' });
                const resultB = name({ name: 'bar' });
                return resultA === resultB;
            }
        }
        return false;
    }

    /**
     * Extracts library detials from the webpack configuration
     * @param {Compiler} compiler Webpack compiler
     * @returns {{target:string,name:string}} an object with `target` (the library type) and `name` (the name the library will get).
     */
    static getLibraryDetails(compiler) {
        const { library } = compiler.options.output;
        if (typeof library === 'object') {
            return {
                target: library.type,
                name: library.name,
            };
        }
        return {
            target: compiler.options.output.libraryTarget,
            name: library,
        };
    }
};
