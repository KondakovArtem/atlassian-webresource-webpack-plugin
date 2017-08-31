/**
 * A Webpack plugin that takes the compilation tree and creates <web-resource> XML definitions.
 * - A <web-resource> for each entry point, including:
 *    * its WRM dependencies
 *    * [entrypoint].bundle.js && [entrypoint].bundle.css,
 *    * <context> set to the entry point name.
 *
 * - A <web-resource> for each requireJS module required using require.ensure (async), including
 *    * its WRM dependencies
 *    * <context> set the the chunk name (last param of the require.ensure call)
 *
 * - A single <web-resource> for all requireJS module required called using require.ensure (async)
 *     * [named-chunk].chunk.js files
 */

const assert = require("assert");
const fs = require("fs");
const path = require('path');

const uuidv4Gen = require('uuid/v4');
const wrmUtils = require("./util/wrm");
const ProvidedExternalModule = require("./ProvidedExternalModule");
const ProvidedDllModule = require("./ProvidedDllModule");
const baseContexts = require("./base-context");

class WrmPlugin {

    /**
     *
     * @param {Object} options - options passed to WRMPlugin
     * @param {String} options.pluginKey - The fully qualified plugin key. e.g.: com.atlassian.jira.plugins.my-jira-plugin
     * @param {String} options.contextMap - One or more "context"s to which an entrypoint will be added. e.g.: {\n\t"my-entry": ["my-plugin-context"]\n}
     * @param {String} options.webresourceKeyMap - Optional map of an explicit name for the web-resource generated per entry point. e.g.: {\n\t"my-entry": "legacy-webresource-name"\n}
     * @param {String} options.xmlDescriptors - Path to the directory where this plugin stores the descriptors about this plugin, used by the WRM to load your frontend code.
     */
    constructor(options = {}) {
        assert(options.pluginKey, `Option [String] "pluginKey" not specified. You must specify a valid fully qualified plugin key. e.g.: com.atlassian.jira.plugins.my-jira-plugin`);
        assert(options.xmlDescriptors, `Option [String] "xmlDescriptors" not specified. You must specify the path to the directory where this plugin stores the descriptors about this plugin, used by the WRM to load your frontend code. This should point somewhere in the "target/classes" directory.`);
        assert(path.isAbsolute(options.xmlDescriptors), `Option [String] "xmlDescriptors" must be absolute!`);

        // convert providedDependencies object to map
        if (typeof options.providedDependencies === 'object' && !(options.providedDependencies instanceof Map)) {
            const deps = options.providedDependencies;
            const map = new Map();
            Object.keys(deps).forEach((key) => {
                map.set(key, deps[key]);
            });
            options.providedDependencies = map;
        }

        // pull out our options
        this.options = Object.assign({
            conditionMap: {},
            contextMap: {},
            webresourceKeyMap: {},
            providedDependencies: new Map(),
            verbose: true,
        }, options);

        // generate an asset uuid per build - this is used to ensure we have a new "cache" for our assets per build.
        // As JIRA-Server does not "rebuild" too often, this can be considered reasonable.
        this.assetUUID = process.env.NODE_ENV === 'production' ? uuidv4Gen() : "DEV_PSEUDO_HASH";
    }

    checkConfig(compiler) {
        compiler.plugin("after-environment", () => {
            // check if output path points to somewhere in target/classes
            const outputPath = compiler.options.output.path;
            if (!outputPath.includes(path.join('target', 'classes'))) {
                this.options.verbose && console.warn(`
*********************************************************************************
The output.path specified in your webpack config does not point to target/classes:

${outputPath}

This is very likely to cause issues - please double check your settings!
*********************************************************************************

`);
            }
        });
    }

    _extractPathPrefixForXml(options) {
        const outputPath = options.output.path;
        // get everything "past" the /target/classes
        const pathPrefix = outputPath.split(path.join('target', 'classes'))[1];
        if (pathPrefix === "" || pathPrefix === "/") {
            return '';
        } else if (pathPrefix === undefined) {
            this.options.verbose && console.warn(`
******************************************************************************
Path prefix for resources could not be extracted as the output path specified 
in webpack does not point to somewhere in "target/classes". 
This is likely to cause problems, please check your settings!

Not adding any path prefix - WRM will probably not be able to find your files!
******************************************************************************
`);
            return '';
        }

        // remove leading/trailing path separator
        const withoutLeadingTrailingSeparators = pathPrefix.replace(new RegExp(`^\\${path.sep}|\\${path.sep}$`, 'g'), '');
        // readd trailing slash - this time OS independent always a "/"
        return withoutLeadingTrailingSeparators + "/";
    }

    _getContextForEntry(entry) {
        let contexts = [].concat(entry).concat(this.options.contextMap[entry]);
        let validContexts = contexts.filter(context => context && typeof context === 'string');
        return validContexts;
    }

    _getWebresourceKeyForEntry(entry) {
        const wrKey = this.options.webresourceKeyMap[entry];
        if (!wrKey || typeof wrKey !== 'string') {
            return `entrypoint-${entry}`;
        }
        return wrKey;
    }

    _getConditionForEntry(entry) {
        return this.options.conditionMap[entry];
    }

    overwritePublicPath(compiler) {
        const that = this;
        compiler.plugin("compilation", (compilation) => {
            compilation.mainTemplate.plugin("require-extensions", function (standardScript) {
                return `${standardScript}
if (typeof AJS !== "undefined") {
    ${this.requireFn}.p = AJS.contextPath() + "/download/resources/${that.options.pluginKey}:assets-${that.assetUUID}/";
}
`
            });
        });
    }

    hookUpProvidedDependencies(compiler) {
        const that = this;
        compiler.plugin("compile", (params) => {
            params.normalModuleFactory.apply({
                apply(normalModuleFactory) {
                    normalModuleFactory.plugin("factory", factory => (data, callback) => {
                        const type = compiler.options.output.libraryTarget;
                        const request = data.dependencies[0].request;
                        // get globally available libraries through wrm
                        if (that.options.providedDependencies.has(request)) {
                            that.verbose && console.log("plugging hole into request to %s, will be provided as a dependency through WRM", request);
                            const p = that.options.providedDependencies.get(request);
                            callback(null, new ProvidedExternalModule(p.import, p.dependency, type));
                            return;
                        }

                        // import web-resources we find dependencies static import statements for
                        const loader = ["wr-dependency!"].find(loader => request.startsWith(loader));
                        if (loader) {
                            const res = request.substr(loader.length);
                            that.verbose && console.log("adding %s as a context dependency through WRM", res);
                            callback(null, new ProvidedDllModule(res, type));
                            return;
                        }

                        factory(data, callback);
                        return;
                    });
                }
            });
        });
    }

    getEntrypointChildChunks(entrypointNames, chunks) {
        const entryPoints = Object.keys(entrypointNames).map(key => chunks.find(c => c.name === key));
        return entryPoints.reduce((all, e) => all.concat(e.chunks), []);
    }

    enableAsyncLoadingWithWRM(compiler) {
        compiler.plugin("compilation", (compilation) => {
            compilation.mainTemplate.plugin("jsonp-script", (standardScript) => {
                // mostly async?
                const entryPointsChildChunks = this.getEntrypointChildChunks(compilation.entrypoints, compilation.chunks);
                const childChunkIds = entryPointsChildChunks.map(c => c.id).reduce((map, id) => {
                    map[id] = true;
                    return map;
                }, {});
                return (
                    `
var WRMChildChunkIds = ${JSON.stringify(childChunkIds)};
if (WRMChildChunkIds[chunkId]) {
    WRM.require('wrc!${this.options.pluginKey}:' + chunkId)
    return promise;
}
${standardScript}`
                );
            });
        });
    }

    _getExternalModules(chunk) {
        return chunk.getModules().filter(m => {
            return m instanceof ProvidedExternalModule
                || m instanceof ProvidedDllModule
        }).map(m => m.getDependency())
    }

    getDependencyForChunks(chunks) {
        const externalDeps = new Set();
        for (const chunk of chunks) {
            for (const dep of this._getExternalModules(chunk)) {
                externalDeps.add(dep);
            }
        }
        return Array.from(externalDeps);
    }

    apply(compiler) {

        this.checkConfig(compiler);

        this.overwritePublicPath(compiler);

        this.hookUpProvidedDependencies(compiler);
        this.enableAsyncLoadingWithWRM(compiler);

        // When the compiler is about to emit files, we jump in to produce our resource descriptors for the WRM.
        compiler.plugin("emit", (compilation, callback) => {

            const assetFiles = Object.keys(compilation.assets)
                    .filter(p => !/\.(js|js\.map)$/.test(p));

            const assets = {
                key: `assets-${this.assetUUID}`,
                resources: assetFiles,
            };

            const entryPointNames = compilation.entrypoints;
            // Used in prod
            const prodEntryPoints = Object.keys(entryPointNames).map(name => {
                const entrypointChunks = entryPointNames[name].chunks;
                const webresourceKey = this._getWebresourceKeyForEntry(name);
                return {
                    key: webresourceKey,
                    contexts: this._getContextForEntry(name),
                    resources: Array.from(new Set([].concat(...entrypointChunks.map(c => c.files), ...assetFiles))),
                    dependencies: baseContexts.concat(this.getDependencyForChunks(entrypointChunks)),
                    conditions: this._getConditionForEntry(name),
                };
            });

            const asyncChunkDescriptors = this.getEntrypointChildChunks(entryPointNames, compilation.chunks).map(c => {
                return {
                    key: `${c.id}`,
                    resources: c.files,
                    dependencies: this.getDependencyForChunks([c])
                }
            });


            const wrmDescriptors = asyncChunkDescriptors
                .concat(prodEntryPoints)
                .concat(assets);

            const xmlDescriptors = wrmUtils.createResourceDescriptors(this._extractPathPrefixForXml(compiler.options), wrmDescriptors);
            const xmlDescriptorWebpackPath = path.relative(compiler.options.output.path, this.options.xmlDescriptors);
            compilation.assets[xmlDescriptorWebpackPath] = {
                source: () => new Buffer(xmlDescriptors),
                size: () => Buffer.byteLength(xmlDescriptors)
            };

            callback();
        });
    }
}

module.exports = WrmPlugin;
