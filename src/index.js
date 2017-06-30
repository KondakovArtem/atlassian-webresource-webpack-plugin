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

const _ = require("lodash");
const assert = require("assert");
const fs = require("fs");
const wrmUtils = require("./util/wrm-utils");
const webpackUtils = require("./util/webpack-utils");
const ExternalModule = require("webpack/lib/ExternalModule");
const providedDependenciesObj = require("./providedDependencies");

const providedDependencies = new Map();
for(const dep of Object.keys(providedDependenciesObj)) {
    providedDependencies.set(dep, providedDependenciesObj[dep]);
}

class WrmPlugin {
    constructor(options = {}) {
        assert(options.options.pluginKey, `Option "pluginKey" not specified. You must specify a valid fully qualified plugin key. e.g.: com.atlassian.jira.plugins.my-jira-plugin`);
        let opts = Object.assign({}, options);
        this.wrmOpts = Object.assign({
            xmlDescriptors: "META-INF/plugin-descriptors/wr-webpack-bundles.xml"
        }, opts.options);
        this.wrmDependencies = {};
        this.wrmDependencies.always = opts.wrmDependencies || [];
        opts

        this.chunkContext = new Map(); // contains all chunk that need to be listed in a context

        this.WRM_SPECIFIC_EXTERNAL = Symbol("WRM_SPECIFIC_EXTERNAL");
        this.WRM_SPECIFIC_DEPENDENCY = Symbol("WRM_SPECIFIC_DEPENDENCY");
    }

    renameEntries(compiler) {
        compiler.plugin("after-environment", () => {
            compiler.options.entry = Object.keys(compiler.options.entry).reduce((newEntries, entryKey) => {
                newEntries[`${this.wrmOpts.pluginKey}:${entryKey}`] = compiler.options.entry[entryKey];
                return newEntries;
            }, {});
        });
    }

    _createExternalModule(request, dependency) {
        const externalModule = new ExternalModule(request, 'var');
        externalModule[this.WRM_SPECIFIC_EXTERNAL] = true;
        externalModule[this.WRM_SPECIFIC_DEPENDENCY] = dependency;
        return externalModule;
    }

    hookUpProvidedDependencies(compiler) {
        const that = this;
        compiler.plugin("compile", (params) => {
            params.normalModuleFactory.apply({ apply(normalModuleFactory){
                // there is something wrong in webpack - currently external modules end up in the entry point not e.g. in an async chunk if they are only needed there
                // this means that WRM will load these dependencies with the entrypoint already. Need to fix this in webpack I guess.
                normalModuleFactory.plugin("factory", factory => (data, callback) => {
                    const request = data.dependencies[0].request;
                    // get globally available libraries through wrm
                    if (providedDependencies.has(request)) {
                        console.log("plugging hole into request to %s, will be provided as a dependency through WRM", request);
                        const p = providedDependencies.get(request);
                        callback(null, that._createExternalModule(p.import, p.dependency));
                        return;
                    }

                    // make wrc imports happen
                    if (request.startsWith("wrc!")) {
                        console.log("adding %s as a context dependency through WRM", request.substr(4));
                        callback(null, that._createExternalModule("{}", request.substr(4)));
                        return;
                    }

                    factory(data, callback);
                    return;
                });
            }}); 
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
    WRM.require('wrc!${this.wrmOpts.pluginKey}:' + chunkId)
    return promise;
}
${standardScript}`
                );
            })
        });
    }

    _getExternalModules(chunk) {
        return chunk.getModules().filter(m => m[this.WRM_SPECIFIC_EXTERNAL]).map(m => m[this.WRM_SPECIFIC_DEPENDENCY])
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

    renameChunks(compiler) {
        compiler.plugin("compilation", (compilation) => {
            compilation.plugin("optimize-chunk-ids", chunks => {
                chunks.forEach((c, i) => {
                    if (c.name && c.name.indexOf(this.wrmOpts.pluginKey) === 0) {
                        return;
                    }
                    const id = c.name || c.id;
                    const newId = `${this.wrmOpts.pluginKey}:${id}`;
                    c.ids = c.ids.map(id => {
                        if (id != c.id) {
                            return id;
                        }
                        return newId;
                    })
                    c.id = newId;
                    c.name = newId;
                });
            });
        });
    }

    apply(compiler) {

        this.renameEntries(compiler);
        this.renameChunks(compiler);

        this.hookUpProvidedDependencies(compiler);
        this.enableAsyncLoadingWithWRM(compiler);

        // When the compiler is about to emit files, we jump in to produce our resource descriptors for the WRM.
        compiler.plugin("emit", (compilation, callback) => {

            const entryPointNames = compilation.entrypoints;
            // Used in prod
            const prodEntryPoints = Object.keys(entryPointNames).map(name => {
                const entrypointChunks = entryPointNames[name].chunks;
                return {
                    key: `context-${name}`,
                    context: name,
                    resources: [].concat(...entrypointChunks.map(c => c.files)),
                    dependencies: this.getDependencyForChunks(entrypointChunks),
                    isProdModeOnly: true
                };
            });

            const asyncChunkDescriptors = this.getEntrypointChildChunks(entryPointNames, compilation.chunks).map(c => {
                return {
                    key: c.id,
                    resources: c.files,
                    dependencies: this.getDependencyForChunks([c])
                }
            })

            const wrmDescriptors = asyncChunkDescriptors
                .concat(prodEntryPoints);

            const xmlDescriptors = wrmUtils.createResourceDescriptors(wrmDescriptors);

            compilation.assets[this.wrmOpts.xmlDescriptors] = {
                source: () => new Buffer(xmlDescriptors),
                size: () => Buffer.byteLength(xmlDescriptors)
            };

            callback();
        });
    }
}

module.exports = WrmPlugin;