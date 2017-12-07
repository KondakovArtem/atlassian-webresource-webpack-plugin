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
const glob = require("glob");
const path = require('path');
const { createHash } = require('crypto');

const uuidv4Gen = require('uuid/v4');
const XMLFormatter = require("./XmlFormatter");
const ProvidedExternalDependencyModule = require("./webpack-modules/ProvidedExternalDependencyModule");
const WrmDependencyModule = require("./webpack-modules/WrmDependencyModule");
const WrmResourceModule = require("./webpack-modules/WrmResourceModule");
const baseContexts = require("./settings/base-contexts");
const WRMHelpers = require("./WRMHelpers");
const WebpackHelpers = require("./WebpackHelpers");
const WebpackRuntimeHelpers = require("./WebpackRuntimeHelpers");
const qUnitRequireMock = require("./shims/qunit-require-shim");
const flattenReduce = require('./flattenReduce');
const logger = require("./logger");

const RESOURCE_JOINER = "__RESOURCE__JOINER__";
class WrmPlugin {

    /**
     *
     * @param {Object} options - options passed to WRMPlugin
     * @param {String} options.pluginKey - The fully qualified plugin key. e.g.: com.atlassian.jira.plugins.my-jira-plugin
     * @param {Object} options.contextMap - One or more "context"s to which an entrypoint will be added. e.g.: {\n\t"my-entry": ["my-plugin-context"]\n}
     * @param {Object} options.webresourceKeyMap - Optional map of an explicit name for the web-resource generated per entry point. e.g.: {\n\t"my-entry": "legacy-webresource-name"\n}
     * @param {Object} options.providedDependencies - Map of provided dependencies. If somewhere in the code this dependency is required, it will not be bundled but instead replaced with the specified placeholder.
     * @param {String} options.xmlDescriptors - Path to the directory where this plugin stores the descriptors about this plugin, used by the WRM to load your frontend code.
     * @param {Boolean} options.verbose - Indicate if log output should be verbose - default is false.
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
            verbose: false,
        }, options);

        logger.setVerbose(this.options.verbose);

        // generate an asset uuid per build - this is used to ensure we have a new "cache" for our assets per build.
        // As JIRA-Server does not "rebuild" too often, this can be considered reasonable.
        this.assetUUID = process.env.NODE_ENV === 'production' ? uuidv4Gen() : "DEV_PSEUDO_HASH";
        this.qunitRequireMockPath = `qunit-require-shim-${this.assetUUID}.js`;
    }

    checkConfig(compiler) {
        compiler.plugin("after-environment", () => {
            // check if output path points to somewhere in target/classes
            const outputOptions = compiler.options.output;
            const outputPath = outputOptions.path;
            if (!outputPath.includes(path.join('target', 'classes'))) {
                logger.warn(`
*********************************************************************************
The output.path specified in your webpack config does not point to target/classes:

${outputPath}

This is very likely to cause issues - please double check your settings!
*********************************************************************************

`);
            }

            // check for the jsonp function option
            const {jsonpFunction} = outputOptions;
            if (!jsonpFunction || jsonpFunction === "webpackJsonp") {
                const generatedJsonpFunction = `atlassianWebpackJsonp${createHash('md5').update(this.options.pluginKey).digest("hex")}`;
                logger.warn(`
*********************************************************************************
The output.jsonpFunction is not specified. This needs to be done to prevent clashes.
An automated jsonpFunction name for this plugin was created:

"${generatedJsonpFunction}"
*********************************************************************************

`);
                outputOptions.jsonpFunction = generatedJsonpFunction;
            }
        });
    }

    getTestFiles(context) {
        const testGlobs = this.options.__testGlobs__;

        if(!testGlobs) {
            return [];
        }
                
        logger.warn(`
******************************************************************************
The option "__testGlobs__" is only available to allow migrating old code. Consider
this option deprecated and try to migrate your code to a proper JS-Testrunner.
******************************************************************************
`);
        return testGlobs.map( g => glob.sync(g, {absolute: true})) // get all matching files
            .reduce((_, _v, _i, files) => { // flatten them and make them unique
                const uniqueFiles = new Set([].concat(...files));
                files.length = 0;
                return Array.from(uniqueFiles);
            })
            .map(file => path.relative(context, file)); // make them relative to the context
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
        WebpackRuntimeHelpers.hookIntoNormalModuleFactory(compiler, factory => (data, callback) => {
            const target = compiler.options.output.libraryTarget;
            const request = data.dependencies[0].request;
            // get globally available libraries through wrm
            if (this.options.providedDependencies.has(request)) {
                logger.log("plugging hole into request to %s, will be provided as a dependency through WRM", request);
                const p = this.options.providedDependencies.get(request);
                callback(null, new ProvidedExternalDependencyModule(p.import, p.dependency, target));
                return;
            }
            factory(data, callback);
            return;
        });
    }

    injectWRMSpecificRequestTypes(compiler) {
        WebpackRuntimeHelpers.hookIntoNormalModuleFactory(compiler, factory => (data, callback) => {
            const target = compiler.options.output.libraryTarget;
            const request = data.dependencies[0].request;
            // import web-resources we find static import statements for
            if (request.startsWith("wr-dependency!")) {
                const res = request.substr("wr-dependency!".length);
                logger.log("adding %s as a web-resource dependency through WRM", res);
                callback(null, new WrmDependencyModule(res, target));
                return;
            }

            // import resources we find static import statements for
            if (request.startsWith("wr-resource!")) {
                const res = request.substr("wr-resource!".length);
                logger.log("adding %s as a resource through WRM", res);
                callback(null, new WrmResourceModule(res, target));
                return;
            }

            factory(data, callback);
            return;
        });
    }

    enableAsyncLoadingWithWRM(compiler) {
        compiler.plugin("compilation", (compilation) => {
            compilation.mainTemplate.plugin("jsonp-script", (standardScript) => {
                // mostly async?
                const entryPointsChildChunks = WebpackHelpers.getChunksWithEntrypointName(compilation.entrypoints, compilation.chunks);
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

    apply(compiler) {

        // ensure settings make sense
        this.checkConfig(compiler);

        // hook up external dependencies
        this.hookUpProvidedDependencies(compiler);
        // allow `wr-dependency/wr-resource` require calls.
        this.injectWRMSpecificRequestTypes(compiler);

        this.overwritePublicPath(compiler);
        this.enableAsyncLoadingWithWRM(compiler);

        // When the compiler is about to emit files, we jump in to produce our resource descriptors for the WRM.
        compiler.plugin("emit", (compilation, callback) => {

            const qunitTestFiles = this.getTestFiles(compiler.options.context);

            const assetFiles = Object.keys(compilation.assets)
                    .filter(p => !/\.(js|css|soy)(\.map)?$/.test(p));

            const assets = {
                key: `assets-${this.assetUUID}`,
                resources: assetFiles,
            };

            const entryPointNames = compilation.entrypoints;
            const resourceToAssetMap = WebpackHelpers.extractResourceToAssetMapForCompilation(compilation.modules);

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
            const commonsChunks = Array.from(Object.keys(entryPointNames)
                .map(name => entryPointNames[name].chunks) // get chunks per entry
                .filter(cs => cs.length > 1) // check if commons chunks exist
                .map(cs => cs.slice(0, -1)) // only take all chunks up to the actual entry chunk
                .reduce(flattenReduce, []) // flatten arrays
                .reduce((set, c) => {
                    set.add(c);
                    return set;
                }, new Set())); // deduplicate

            /**
             * Create a key and the fully-qualified web-resource descriptor for every commons-chunk.
             * This is needed to point to reference these chunks as dependency in the entrypoint chunks
             *
             * <web-resource>
             *   ...
             *   <dependency>this-plugin-key:commons_some_chunk</dependency>
             *   ...
             */
            const commonsChunkDependencyKeyMap = new Map();
            for(const c of commonsChunks) {
                commonsChunkDependencyKeyMap.set(c.name, {
                    key: `commons_${c.name}`,
                    dependency: `${this.options.pluginKey}:commons_${c.name}`
                })
            }

            /**
             * Create descriptors for the commons-chunk web-resources that have to be created.
             * These include - like other chunk-descriptors their assets and external resources etc.
             */
            const commonDescriptors = commonsChunks.map(c => {
                const additionalFileDeps = WebpackHelpers.getDependencyResourcesFromChunk(c, resourceToAssetMap);
                return {
                    key: commonsChunkDependencyKeyMap.get(c.name).key,
                    externalResources: WebpackHelpers.getExternalResourcesForChunk(c),
                    resources: Array.from(new Set(c.files.concat(additionalFileDeps))),
                    dependencies: WebpackHelpers.getDependenciesForChunks([c])
                }
            });

            // Used in prod
            const prodEntryPoints = Object.keys(entryPointNames).map(name => {
                const webresourceKey = WRMHelpers.getWebresourceKeyForEntry(name, this.options.webresourceKeyMap);
                const entrypointChunks = entryPointNames[name].chunks;
                const actualEntrypointChunk = entrypointChunks[entrypointChunks.length-1];

                // Retrieve all commons-chunk this entrypoint depends on. These must be added as "<dependency>"s to the web-resource of this entrypoint
                const commonDeps = entrypointChunks.map(c => commonsChunkDependencyKeyMap.get(c.name)).filter(Boolean).map(val => val.dependency);

                const additionalFileDeps = entrypointChunks.map(c => WebpackHelpers.getDependencyResourcesFromChunk(c, resourceToAssetMap));
                const extractedTestResources = Array.from(WebpackHelpers.extractAllFilesFromChunks([actualEntrypointChunk], compiler.options.context, RESOURCE_JOINER))
                    .map(resource => {
                        if (resource.includes(RESOURCE_JOINER)) {
                            return resource.split(RESOURCE_JOINER);
                        }
                        return [resource, resource];
                    });
                const pathPrefix = WRMHelpers.extractPathPrefixForXml(compiler.options);
                const testFiles = [
                    [`${pathPrefix}${this.qunitRequireMockPath}`, `${pathPrefix}${this.qunitRequireMockPath}`] // require mock to allow imports like "wr-dependency!context"
                ].concat(extractedTestResources);
                const testDependencies = Array.from(WebpackHelpers.extractAllDependenciesFromChunk(entrypointChunks));
                return {
                    key: webresourceKey,
                    contexts: WRMHelpers.getContextForEntry(name, this.options.contextMap),
                    externalResources: WebpackHelpers.getExternalResourcesForChunk(actualEntrypointChunk),
                    resources: Array.from(new Set([].concat(actualEntrypointChunk.files, ...additionalFileDeps))),
                    dependencies: baseContexts.concat(WebpackHelpers.getDependenciesForChunks([actualEntrypointChunk]), commonDeps),
                    conditions: WRMHelpers.getConditionForEntry(name, this.options.conditionMap),
                    testFiles,
                    testDependencies
                };
            });

            const asyncChunkDescriptors = WebpackHelpers.getChunksWithEntrypointName(entryPointNames, compilation.chunks).map(c => {
                const additionalFileDeps = WebpackHelpers.getDependencyResourcesFromChunk(c, resourceToAssetMap);
                return {
                    key: `${c.id}`,
                    externalResources: WebpackHelpers.getExternalResourcesForChunk(c),
                    resources: Array.from(new Set(c.files.concat(additionalFileDeps))),
                    dependencies: WebpackHelpers.getDependenciesForChunks([c])
                }
            });

            const wrmDescriptors = commonDescriptors
                .concat(asyncChunkDescriptors)
                .concat(prodEntryPoints)
                .concat(assets);

            const pathPrefix = WRMHelpers.extractPathPrefixForXml(compiler.options);
            const xmlDescriptors = XMLFormatter.createResourceDescriptors(pathPrefix, wrmDescriptors, qunitTestFiles);
            const xmlDescriptorWebpackPath = path.relative(compiler.options.output.path, this.options.xmlDescriptors);
            compilation.assets[xmlDescriptorWebpackPath] = {
                source: () => new Buffer(xmlDescriptors),
                size: () => Buffer.byteLength(xmlDescriptors)
            };

            compilation.assets[this.qunitRequireMockPath] = {
                source: () => new Buffer(qUnitRequireMock),
                size: () => Buffer.byteLength(qUnitRequireMock)
            }

            callback();
        });
    }
}

module.exports = WrmPlugin;
