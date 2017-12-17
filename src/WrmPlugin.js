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

const assert = require('assert');
const path = require('path');
const { createHash } = require('crypto');
const PrettyData = require('pretty-data').pd;
const uuidv4Gen = require('uuid/v4');
const fs = require('fs');
const mkdirp = require('mkdirp');
const urlJoin = require('url-join');

const XMLFormatter = require('./XmlFormatter');
const ProvidedExternalDependencyModule = require('./webpack-modules/ProvidedExternalDependencyModule');
const WrmDependencyModule = require('./webpack-modules/WrmDependencyModule');
const WrmResourceModule = require('./webpack-modules/WrmResourceModule');
const WRMHelpers = require('./WRMHelpers');
const WebpackHelpers = require('./WebpackHelpers');
const WebpackRuntimeHelpers = require('./WebpackRuntimeHelpers');
const logger = require('./logger');
const QUnitTestResources = require('./QUnitTestResources');
const AppResources = require('./AppResources');
const flattenReduce = require('./flattenReduce');

class WrmPlugin {
    /**
     *
     * @param {Object} options - options passed to WRMPlugin
     * @param {String} options.pluginKey - The fully qualified plugin key. e.g.: com.atlassian.jira.plugins.my-jira-plugin
     * @param {Object} options.contextMap - One or more "context"s to which an entrypoint will be added. e.g.: {\n\t"my-entry": ["my-plugin-context"]\n}
     * @param {Object} options.webresourceKeyMap - Optional map of an explicit name for the web-resource generated per entry point. e.g.: {\n\t"my-entry": "legacy-webresource-name"\n}
     * @param {Object} options.providedDependencies - Map of provided dependencies. If somewhere in the code this dependency is required, it will not be bundled but instead replaced with the specified placeholder.
     * @param {String} options.xmlDescriptors - Path to the directory where this plugin stores the descriptors about this plugin, used by the WRM to load your frontend code.
     * @param {String} options.assetContentTypes - Specific content-types to be used for certain asset types. Will be added as '<param name="content-type"...' to the resource of the asset.
     * @param {String} options.watch - Trigger watch mode - this requires webpack-dev-server and will redirect requests to the entrypoints to the dev-server that must be running under webpacks "options.output.publicPath"
     * @param {Boolean} options.verbose - Indicate if log output should be verbose - default is false.
     */
    constructor(options = {}) {
        assert(
            options.pluginKey,
            `Option [String] "pluginKey" not specified. You must specify a valid fully qualified plugin key. e.g.: com.atlassian.jira.plugins.my-jira-plugin`
        );
        assert(
            options.xmlDescriptors,
            `Option [String] "xmlDescriptors" not specified. You must specify the path to the directory where this plugin stores the descriptors about this plugin, used by the WRM to load your frontend code. This should point somewhere in the "target/classes" directory.`
        );
        assert(path.isAbsolute(options.xmlDescriptors), `Option [String] "xmlDescriptors" must be absolute!`);

        // convert providedDependencies object to map
        if (typeof options.providedDependencies === 'object' && !(options.providedDependencies instanceof Map)) {
            const deps = options.providedDependencies;
            const map = new Map();
            Object.keys(deps).forEach(key => {
                map.set(key, deps[key]);
            });
            options.providedDependencies = map;
        }

        // pull out our options
        this.options = Object.assign(
            {
                conditionMap: {},
                contextMap: {},
                webresourceKeyMap: {},
                providedDependencies: new Map(),
                verbose: false,
                assetContentTypes: {
                    svg: 'image/svg+xml',
                },
            },
            options
        );

        logger.setVerbose(this.options.verbose);

        // generate an asset uuid per build - this is used to ensure we have a new "cache" for our assets per build.
        // As JIRA-Server does not "rebuild" too often, this can be considered reasonable.
        this.assetUUID = process.env.NODE_ENV === 'production' ? uuidv4Gen() : 'DEV_PSEUDO_HASH';
    }

    checkConfig(compiler) {
        compiler.plugin('after-environment', () => {
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
            const { jsonpFunction } = outputOptions;
            if (!jsonpFunction || jsonpFunction === 'webpackJsonp') {
                const generatedJsonpFunction = `atlassianWebpackJsonp${createHash('md5')
                    .update(this.options.pluginKey)
                    .digest('hex')}`;
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

    overwritePublicPath(compiler) {
        const that = this;
        compiler.plugin('compilation', compilation => {
            compilation.mainTemplate.plugin('require-extensions', function(standardScript) {
                return `${standardScript}
if (typeof AJS !== "undefined") {
    ${this.requireFn}.p = AJS.contextPath() + "/download/resources/${that.options.pluginKey}:assets-${that.assetUUID}/";
}
`;
            });
        });
    }

    hookUpProvidedDependencies(compiler) {
        WebpackRuntimeHelpers.hookIntoNormalModuleFactory(compiler, factory => (data, callback) => {
            const target = compiler.options.output.libraryTarget;
            const request = data.dependencies[0].request;
            // get globally available libraries through wrm
            if (this.options.providedDependencies.has(request)) {
                logger.log('plugging hole into request to %s, will be provided as a dependency through WRM', request);
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
            if (request.startsWith('wr-dependency!')) {
                const res = request.substr('wr-dependency!'.length);
                logger.log('adding %s as a web-resource dependency through WRM', res);
                callback(null, new WrmDependencyModule(res, target));
                return;
            }

            // import resources we find static import statements for
            if (request.startsWith('wr-resource!')) {
                const res = request.substr('wr-resource!'.length);
                logger.log('adding %s as a resource through WRM', res);
                callback(null, new WrmResourceModule(res, target));
                return;
            }

            factory(data, callback);
            return;
        });
    }

    enableAsyncLoadingWithWRM(compiler) {
        compiler.plugin('compilation', compilation => {
            compilation.mainTemplate.plugin('jsonp-script', standardScript => {
                // mostly async?
                const entryPointsChildChunks = WebpackHelpers.getChunksWithEntrypointName(
                    compilation.entrypoints,
                    compilation.chunks
                );
                const childChunkIds = entryPointsChildChunks.map(c => c.id).reduce((map, id) => {
                    map[id] = true;
                    return map;
                }, {});
                return `
var WRMChildChunkIds = ${JSON.stringify(childChunkIds)};
if (WRMChildChunkIds[chunkId]) {
    WRM.require('wrc!${this.options.pluginKey}:' + chunkId)
    return promise;
}
${standardScript}`;
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

        if (!this.options.watch) {
            this.overwritePublicPath(compiler);
        }
        this.enableAsyncLoadingWithWRM(compiler);

        // When the compiler is about to emit files, we jump in to produce our resource descriptors for the WRM.
        compiler.plugin('emit', (compilation, callback) => {
            const pathPrefix = WRMHelpers.extractPathPrefixForXml(compiler.options);
            const appResourceGenerator = new AppResources(this.assetUUID, this.options, compiler, compilation);
            const testResourcesGenerator = new QUnitTestResources(this.assetUUID, this.options, compiler, compilation);

            const webResources = [];

            const resourceDescriptors = XMLFormatter.createResourceDescriptors(
                appResourceGenerator.getResourceDescriptors(),
                pathPrefix,
                this.options.assetContentTypes
            );
            webResources.push(resourceDescriptors);

            if (this.options.__testGlobs__ && !this.options.watch) {
                testResourcesGenerator.injectQUnitShim();
                const testResourceDescriptors = XMLFormatter.createTestResourceDescriptors(
                    testResourcesGenerator.createAllFileTestWebResources()
                );
                const qUnitTestResourceDescriptors = XMLFormatter.createQUnitResourceDescriptors(
                    testResourcesGenerator.getTestFiles()
                );

                webResources.push(testResourceDescriptors, qUnitTestResourceDescriptors);
            }

            const xmlDescriptors = PrettyData.xml(`<bundles>${webResources.join('')}</bundles>`);
            const xmlDescriptorWebpackPath = path.relative(compiler.options.output.path, this.options.xmlDescriptors);
            compilation.assets[xmlDescriptorWebpackPath] = {
                source: () => new Buffer(xmlDescriptors),
                size: () => Buffer.byteLength(xmlDescriptors),
            };

            if (this.options.watch && !this.watchDoneOnce) {
                this.watchDoneOnce = true;
                const outputPath = compiler.options.output.path;
                const entrypointDescriptors = appResourceGenerator
                    .getAsyncChunksResourceDescriptors()
                    .concat(appResourceGenerator.getEntryPointsResourceDescriptors());
                const redirectDescriptors = entrypointDescriptors
                    .map(c => c.resources)
                    .reduce(flattenReduce, [])
                    .filter(res => path.extname(res) === '.js')
                    .map(r => ({ fileName: r, writePath: path.join(outputPath, r) }));

                compiler.plugin('done', () => {
                    mkdirp.sync(path.dirname(this.options.xmlDescriptors));
                    fs.writeFileSync(this.options.xmlDescriptors, xmlDescriptors, 'utf8');
                    function generateAssetCall(file) {
                        const pathName = urlJoin(compiler.options.output.publicPath, file);
                        return `
!function(){
    var script = document.createElement('script');
    script.src = '${pathName}';
    script.async = false;
    document.head.appendChild(script);
}();
`.trim();
                    }
                    for (const { fileName, writePath } of redirectDescriptors) {
                        fs.writeFileSync(writePath, generateAssetCall(fileName), 'utf8');
                    }
                });
            }

            callback();
        });
    }
}

module.exports = WrmPlugin;
