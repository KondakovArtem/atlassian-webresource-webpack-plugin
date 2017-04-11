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
const wrmUtils = require("./util/wrm-utils");
const webpackUtils = require("./util/webpack-utils");
const wrmDeps = require("./config/webpack-dependencies-conf");

function getAsyncDescriptorForChunks(chunks) {
    // all the resources that aren't entry point (aka the async ones).
    const resources = _.flatten(_.values(chunks).map((chunk) =>
        chunk.entry ? [] : chunk.files
    ));
    return {
        key: "webpack-async-chunks",
        resources: resources
    };
}

function getWrmDepsForChunk(chunk) {
    const allWrmDeps = _.merge({}, wrmDeps.external , wrmDeps.internal);
    const unFilteredDeps = _.map(chunk.modules, (module) => {
        const name = module.rawRequest;
        if (name) {

            return allWrmDeps[name];
        }
        if (module.type === "var") {
            const match = module.request.match(/require\(['"](.*?)['"]\)/);
            return match ? allWrmDeps[match[1]] : [];
        }
    });
    const globalDeps = allWrmDeps["*"];
    const chunkDeps = _.uniq(_.flatten(_.compact(unFilteredDeps)));
    return [].concat(globalDeps).concat(chunkDeps);
}

function mapChunkValues(chunks, func) {
    return _.compact(_.values(_.mapValues(chunks, func)));
}

class WrmPlugin {
    apply(compiler) {
        // When the compiler is about to emit files, we jump in to produce our resource descriptors for the WRM.
        compiler.plugin("emit", (compilation, callback) => {

            // This is a necessary hack that appends the locale to the script tag that webpack inserts for dynamic
            // requires (require.ensure) so the i18n strings are translated correctly by the WRM transformer.
            _.each(compilation.assets, (asset, name) => {
                if (/\.js$/.test(name)) {
                    const originalSource = asset.source();
                    const jsFileWithLocalString = `".js?locale=" + __webpack_public_path_locale__`;
                    asset.source = () => originalSource.replace(/"\.js"/g, `${jsFileWithLocalString}`);
                    asset.size = () => asset.source().length;
                }
            });

            const contextDependencies = mapChunkValues(
                compilation.namedChunks, (chunk, name) => {
                    return {
                        key: `context-deps-${name}`,
                        context: name,
                        dependencies: getWrmDepsForChunk(chunk),
                        resources: []
                    }
                });

            // Used in prod
            const prodEntryPoints = mapChunkValues(
                compilation.namedChunks, (chunk, name) => {
                    if (chunk.entry) {
                        return {
                            key: `context-${name}`,
                            context: name,
                            resources: chunk.files,
                            isProdModeOnly: true
                        };
                    }
                });

            // creates a file that simple document.writes the script or style tag that links to the
            // file on the webpack dev server.
            const devEntryPoints = mapChunkValues(
                compilation.namedChunks, (chunk, name) => {
                    if (chunk.entry) {
                        const files = chunk.files.map((file) => {
                            const devServerLink = webpackUtils.writeDevServerLink(compiler.options.devServerUrl, file);
                            if (devServerLink) {
                                const fileName = `dev-${file}`.replace(/\.css$/, ".css.js");
                                compilation.assets[fileName] = {
                                    source: () => new Buffer(devServerLink),
                                    size: () => Buffer.byteLength(devServerLink)
                                };
                                return fileName;
                            }
                            return file;
                        });
                        return {
                            key: `dev-context-${name}`,
                            context: name,
                            dependencies: getWrmDepsForChunk(chunk),
                            resources: files,
                            isDevModeOnly: true
                        };
                    }
                });

            // Anything that is required in code using require.ensure, becomes a namedChunk. They are required at asyncly
            // at runtime. Using the baseurl of the wrm descriptor we create here. /baseurl/[namechunk].js
            const asyncChunkDescriptor =
                getAsyncDescriptorForChunks(compilation.namedChunks);

            const wrmDescriptors =
                [asyncChunkDescriptor]
                    .concat(contextDependencies)
                    .concat(prodEntryPoints)
                    .concat(devEntryPoints);

            const xmlDescriptors = wrmUtils.createResourceDescriptors(wrmDescriptors);

            compilation.assets["META-INF/plugin-descriptors/wr-webpack-bundles.xml"] = {
                source: () => new Buffer(xmlDescriptors),
                size: () => Buffer.byteLength(xmlDescriptors)
            };

            callback();
        });

    };
}
module.exports = WrmPlugin;