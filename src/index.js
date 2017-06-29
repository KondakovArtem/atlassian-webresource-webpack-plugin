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

const providedModules = new Map();
providedModules.set("jquery", "require('jquery')");
providedModules.set("backbone", "require('backbone')");
providedModules.set("underscore", "require('underscore')");

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
    }

    renameEntries(compiler) {
        compiler.plugin("after-environment", () => {
            compiler.options.entry = Object.keys(compiler.options.entry).reduce((newEntries, entryKey) => {
                newEntries[`${this.wrmOpts.pluginKey}:${entryKey}`] = compiler.options.entry[entryKey];
                return newEntries;
            }, {});
        });
    }

    hookUpProvidedDependencies(compiler) {
        compiler.plugin("after-environment", () => {
            const _oldExt = compiler.options.externals
            compiler.options.externals = [
                _oldExt,
                function (context, request, callback) {
                    if (!providedModules.has(request)) {
                        return callback();
                    }

                    callback(null, 'var ' + providedModules.get(request));
                }
            ]
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
                const commonChunks = entryPointNames[name].chunks;
                return {
                    key: `context-${name}`,
                    context: name,
                    resources: [].concat(...commonChunks.map(c => c.files)),
                    isProdModeOnly: true
                };
            });

            const asyncChunkDescriptors = this.getEntrypointChildChunks(entryPointNames, compilation.chunks).map(c => {
                return {
                    key: c.id,
                    resources: c.files
                }
            })

            const wrmDescriptors = asyncChunkDescriptors
                // .concat(contextDependencies)
                .concat(prodEntryPoints)
            // .concat(devEntryPoints);

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