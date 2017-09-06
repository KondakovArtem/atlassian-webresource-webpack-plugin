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

const uuidv4Gen = require('uuid/v4');
const wrmUtils = require("./util/wrm");
const ProvidedExternalDependencyModule = require("./ProvidedExternalDependencyModule");
const WrmDependencyModule = require("./WrmDependencyModule");
const WrmResourceModule = require("./WrmResourceModule");
const baseContexts = require("./base-context");
const qUnitRequireMock = require("./qunit-require-test-mock");

const RESOURCE_JOINER = "__RESOURCE__JOINER__";
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
        this.qunitRequireMockPath = `qunit-require-test-mock-${this.assetUUID}.js`;
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

    getTestFiles(context) {
        const testGlobs = this.options.__testGlobs__;

        if(!testGlobs) {
            return [];
        }
                
        this.options.verbose && console.warn(`
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
                        const target = compiler.options.output.libraryTarget;
                        const request = data.dependencies[0].request;
                        // get globally available libraries through wrm
                        if (that.options.providedDependencies.has(request)) {
                            that.options.verbose && console.log("plugging hole into request to %s, will be provided as a dependency through WRM", request);
                            const p = that.options.providedDependencies.get(request);
                            callback(null, new ProvidedExternalDependencyModule(p.import, p.dependency, target));
                            return;
                        }

                        // import web-resources we find static import statements for
                        if (request.startsWith("wr-dependency!")) {
                            const res = request.substr("wr-dependency!".length);
                            that.options.verbose && console.log("adding %s as a web-resource dependency through WRM", res);
                            callback(null, new WrmDependencyModule(res, target));
                            return;
                        }

                        // import resources we find static import statements for
                        if (request.startsWith("wr-resource!")) {
                            const res = request.substr("wr-resource!".length);
                            that.options.verbose && console.log("adding %s as a resource through WRM", res);
                            callback(null, new WrmResourceModule(res, target));
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

    _getExternalDependencyModules(chunk) {
        return chunk.getModules().filter(m => {
            return m instanceof ProvidedExternalDependencyModule
                || m instanceof WrmDependencyModule
        }).map(m => m.getDependency())
    }

    getDependencyForChunks(chunks) {
        const externalDeps = new Set();
        for (const chunk of chunks) {
            for (const dep of this._getExternalDependencyModules(chunk)) {
                externalDeps.add(dep);
            }
        }
        return Array.from(externalDeps);
    }

    // find all dependencies defined in the specified chunks
    // needed to build a web-resource for qunit tests
    extractAllDependencies(chunks) {
        let dependencyTreeSet = new Set();
        for(const chunk of chunks) {
            // filter out "runtime" chunk
            if (chunk.getModules().length > 0) {
                const subChunkSet = this.extractAllDependencies(chunk.chunks);
                dependencyTreeSet = new Set([...dependencyTreeSet, ...subChunkSet]);
            }
        }
        dependencyTreeSet = new Set([...dependencyTreeSet, ...this.getDependencyForChunks(chunks)]);
        return dependencyTreeSet;
    }

    _getExternalResourceModules(chunk) {
        return chunk.getModules().filter(m => m instanceof WrmResourceModule).map(m => m.getResourcePair())
    }

    getExternalResourcesForChunks(chunks) {
        const externalResources = new Set();
        for (const chunk of chunks) {
            for (const dep of this._getExternalResourceModules(chunk)) {
                externalResources.add(dep);
            }
        }
        return Array.from(externalResources);
    }

    extractAdditionalAssetsFromChunk(chunk) {
        const ownDeps = chunk.getModules().map(m => m.resource);
        const ownDepsSet = new Set(ownDeps);
        const fileDeps = chunk.getModules().map(m => m.fileDependencies).reduce((all, fds) => all.concat(fds), []);
        const fileDepsSet = new Set(fileDeps);
        return Array.from(fileDepsSet).filter(filename => !ownDepsSet.has(filename) && !/\.(js|css|soy)(\.map)?$/.test(filename));
    }

    extractResourceToAssetMapForCompilation(compilationModules) {
        return compilationModules
            .filter(m => m.resource && Object.keys(m.assets).length > 0) // is an actual asset thingy
            .map(m => [m.resource, Object.keys(m.assets)[0]])
            .reduce((set, [resource, asset]) => {
                set.set(resource, asset);
                return set;
            }, new Map());
    }

    getDependencyResourcesFromChunk(chunk, resourceToAssetMap) {
        const deps =this.extractAdditionalAssetsFromChunk(chunk);
        return deps
            .filter(dep => resourceToAssetMap.has(dep))
            .map(dep => resourceToAssetMap.get(dep))
    }

    // get all files used in a chunk
    // this is needed to create a web-resource that can be used by qunit tests.
    // this is a "sledgehammer approach" to avoid having to create an entry point per qunit tests and building it via webpack.
    extractAllFiles(chunks, context) {
        function addModule(m, container) {
            const deps = m.dependencies
                .map(d => d.module)
                .filter(Boolean)
                .filter(m => {
                    // filter out all "virtual" modules that do not reference an actual file (or a wrm web-resource)
                    if(m.resource) return true;
                    if(m instanceof WrmResourceModule) return true;
                    return false;
                })
                
                .filter(m => !m.resource || !m.resource.includes("node_modules")) // if it references a file remove it if it comes from "node_modules"
                .forEach(m => addModule(m, container)); // recursively add modules own dependencies first

            if(m.resource && !m.resource.includes("node_modules")) {
                const reference = path.relative(context, m.resource);
                container.add(reference);
            }

            // handle imports of resources through "wr-resource!..."-syntax 
            if(m instanceof WrmResourceModule) {
                container.add(m.getResourcePair().join(RESOURCE_JOINER));
            }
        }

        let dependencyTreeSet = new Set();
        for(const chunk of chunks) {
            // make sure only the files for this entrypoint end up in the test-files chunk
            if (chunk.getModules().length > 0) {
                const subchunkSet = this.extractAllFiles(chunk.chunks, context);
                dependencyTreeSet = new Set([...dependencyTreeSet, ...subchunkSet]);
            }

            for (const mod of chunk.modules) {
                addModule(mod, dependencyTreeSet);
            }
        }
        return dependencyTreeSet;
    }

    apply(compiler) {

        this.checkConfig(compiler);

        this.overwritePublicPath(compiler);

        this.hookUpProvidedDependencies(compiler);
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
            const resourceToAssetMap = this.extractResourceToAssetMapForCompilation(compilation.modules);

            const commonsChunks = Array.from(Object.keys(entryPointNames)
                .map(name => entryPointNames[name].chunks) // get chunks per entry
                .filter(cs => cs.length > 1) // check if commons chunks exist
                .map(cs => cs.slice(0, -1)) // only take all chunks up to the actual entry chunk
                .reduce((all, cs) => all.concat(cs), []) // flatten arrays
                .reduce((set, c) => {
                    set.add(c);
                    return set;
                }, new Set())); // deduplicate

            const commonsChunkDependencyKeyMap = new Map();
            for(const c of commonsChunks) {
                commonsChunkDependencyKeyMap.set(c.name, {
                    key: `commons_${c.name}`,
                    dependency: `${this.options.pluginKey}:commons_${c.name}`
                })
            }
            const commonDescriptors = commonsChunks.map(c => {
                const additionalFileDeps = this.getDependencyResourcesFromChunk(c, resourceToAssetMap);
                return {
                    key: commonsChunkDependencyKeyMap.get(c.name).key,
                    externalResources: this.getExternalResourcesForChunks([c]),
                    resources: Array.from(new Set(c.files.concat(additionalFileDeps))),
                    dependencies: this.getDependencyForChunks([c])
                }
            });

            // Used in prod
            const prodEntryPoints = Object.keys(entryPointNames).map(name => {
                const webresourceKey = this._getWebresourceKeyForEntry(name);
                const entrypointChunks = entryPointNames[name].chunks;
                const actualEntrypointChunk = entrypointChunks[entrypointChunks.length-1];
                const commonDeps = entrypointChunks.map(c => commonsChunkDependencyKeyMap.get(c.name)).filter(Boolean).map(val => val.dependency);
                const additionalFileDeps = entrypointChunks.map(c => this.getDependencyResourcesFromChunk(c, resourceToAssetMap));
                const extractedTestResources = Array.from(this.extractAllFiles([actualEntrypointChunk], compiler.options.context))
                    .map(resource => {
                        if (resource.includes(RESOURCE_JOINER)) {
                            return resource.split(RESOURCE_JOINER);
                        }
                        return [resource, resource];
                    });
                const testFiles = [
                    [`${this._extractPathPrefixForXml(compiler.options)}${this.qunitRequireMockPath}`, `${this._extractPathPrefixForXml(compiler.options)}${this.qunitRequireMockPath}`] // require mock to allow imports like "wr-dependency!context"
                ].concat(extractedTestResources);
                const testDependencies = Array.from(this.extractAllDependencies(entrypointChunks));
                return {
                    key: webresourceKey,
                    contexts: this._getContextForEntry(name),
                    externalResources: this.getExternalResourcesForChunks([actualEntrypointChunk]),
                    resources: Array.from(new Set([].concat(actualEntrypointChunk.files, ...additionalFileDeps))),
                    dependencies: baseContexts.concat(this.getDependencyForChunks([actualEntrypointChunk]), commonDeps),
                    conditions: this._getConditionForEntry(name),
                    testFiles,
                    testDependencies
                };
            });

            const asyncChunkDescriptors = this.getEntrypointChildChunks(entryPointNames, compilation.chunks).map(c => {
                const additionalFileDeps = this.getDependencyResourcesFromChunk(c, resourceToAssetMap);
                return {
                    key: `${c.id}`,
                    externalResources: this.getExternalResourcesForChunks([c]),
                    resources: Array.from(new Set(c.files.concat(additionalFileDeps))),
                    dependencies: this.getDependencyForChunks([c])
                }
            });

            const wrmDescriptors = commonDescriptors
                .concat(asyncChunkDescriptors)
                .concat(prodEntryPoints)
                .concat(assets);

            const xmlDescriptors = wrmUtils.createResourceDescriptors(this._extractPathPrefixForXml(compiler.options), wrmDescriptors, qunitTestFiles);
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
