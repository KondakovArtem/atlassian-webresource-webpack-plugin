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

const defaultTransformations = {
    js: ['jsI18n'],
    soy: ['soyTransformer', 'jsI18n'],
    less: ['lessTransformer'],
};

class WrmPlugin {
    static extendTransformations(transformations) {
        for (const key of Object.keys(defaultTransformations)) {
            const customTransformations = Array.isArray(transformations[key]) ? transformations[key] : [];

            transformations[key] = [...defaultTransformations[key], ...customTransformations];
        }

        return transformations;
    }

    /**
     *
     * @param {Object} options - options passed to WRMPlugin
     * @param {String} options.pluginKey - The fully qualified plugin key. e.g.: com.atlassian.jira.plugins.my-jira-plugin
     * @param {Object} options.contextMap - One or more "context"s to which an entrypoint will be added. e.g.: {\n\t"my-entry": ["my-plugin-context"]\n}
     * @param {Object} options.conditionMap - Map of conditions to be applied to the specified entry-point
     * @param {Object} options.transformationMap - Map of transformations to be applied to the specified file-types
     * @param {Object} options.webresourceKeyMap - Optional map of an explicit name for the web-resource generated per entry point. e.g.: {\n\t"my-entry": "legacy-webresource-name"\n}
     * @param {Object} options.providedDependencies - Map of provided dependencies. If somewhere in the code this dependency is required, it will not be bundled but instead replaced with the specified placeholder.
     * @param {String} options.xmlDescriptors - Path to the directory where this plugin stores the descriptors about this plugin, used by the WRM to load your frontend code.
     * @param {String} options.assetContentTypes - Specific content-types to be used for certain asset types. Will be added as '<param name="content-type"...' to the resource of the asset.
     * @param {String} options.watch - Trigger watch mode - this requires webpack-dev-server and will redirect requests to the entrypoints to the dev-server that must be running under webpacks "options.output.publicPath"
     * @param {String} options.watchPrepare - In conjunction with watch mode - indicates that only "redirects" to a webserver should be build in this run.
     * @param {Boolean} options.standalone - Build standalone web-resources - assumes no transformations, other chunks or base contexts are needed
     * @param {Boolean} options.noWRM - Do not add any WRM specifics to the webpack runtime to allow development on a greenfield
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
                transformationMap: defaultTransformations,
            },
            options
        );

        logger.setVerbose(this.options.verbose);

        // make sure transformation map is an object of unique items
        const { transformationMap } = this.options;
        this.options.transformationMap = this.ensureTransformationsAreUnique(
            transformationMap === false ? {} : transformationMap
        );

        // generate an asset uuid per build - this is used to ensure we have a new "cache" for our assets per build.
        // As JIRA-Server does not "rebuild" too often, this can be considered reasonable.
        this.assetUUID = process.env.NODE_ENV === 'production' ? uuidv4Gen() : 'DEV_PSEUDO_HASH';
    }

    ensureTransformationsAreUnique(transformations) {
        return Object.keys(transformations).reduce((result, key) => {
            result[key] = Array.from(new Set(transformations[key]));

            return result;
        }, {});
    }

    checkConfig(compiler) {
        compiler.hooks.afterEnvironment.tap('Check Config', () => {
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
        compiler.hooks.compilation.tap('OverwritePublicPath Compilation', compilation => {
            compilation.mainTemplate.hooks.requireExtensions.tap('OverwritePublicPath Require-Extensions', function(
                standardScript
            ) {
                return `${standardScript}
if (typeof AJS !== "undefined") {
    ${compilation.mainTemplate.requireFn}.p = AJS.contextPath() + "/download/resources/${
                    that.options.pluginKey
                }:assets-${that.assetUUID}/";
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
                callback(null, new WrmDependencyModule(res, target, this.options.pluginKey));
                return;
            }

            // import resources we find static import statements for
            if (request.startsWith('wr-resource!')) {
                const res = request.substr('wr-resource!'.length);
                logger.log('adding %s as a resource through WRM', res);

                callback(null, new WrmResourceModule(res, target, data.context, compiler.options.context));
                return;
            }

            factory(data, callback);
            return;
        });
    }

    enableAsyncLoadingWithWRM(compiler) {
        compiler.hooks.compilation.tap('enable async loading with wrm - compilation', compilation => {
            // copy & pasted hack from webpack
            if (!compilation.mainTemplate.hooks.jsonpScript) {
                const SyncWaterfallHook = require('tapable').SyncWaterfallHook;
                compilation.mainTemplate.hooks.jsonpScript = new SyncWaterfallHook(['source', 'chunk', 'hash']);
            }
            compilation.mainTemplate.hooks.jsonpScript.tap(
                'enable async loading with wrm - jsonp-script',
                standardScript => {
                    // mostly async?
                    const entryPointsChildChunks = WebpackHelpers.getAllAsyncChunks([
                        ...compilation.entrypoints.values(),
                    ]);
                    const childChunkIds = entryPointsChildChunks
                        .map(c => c.id)
                        .reduce((map, id) => {
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
                }
            );
        });
    }

    shouldOverwritePublicPath() {
        if (this.options.watch) {
            return false;
        }
        if (this.options.standalone) {
            return false;
        }
        if (this.options.noWRM) {
            return false;
        }

        return true;
    }

    shouldEnableAsyncLoadingWithWRM() {
        if (this.options.standalone) {
            return false;
        }
        if (this.options.noWRM) {
            return false;
        }
        if (this.options.watch) {
            return false;
        }

        return true;
    }

    apply(compiler) {
        // ensure settings make sense
        this.checkConfig(compiler);

        // hook up external dependencies
        this.hookUpProvidedDependencies(compiler);
        // allow `wr-dependency/wr-resource` require calls.
        this.injectWRMSpecificRequestTypes(compiler);

        if (this.shouldOverwritePublicPath()) {
            this.overwritePublicPath(compiler);
        }
        if (this.shouldEnableAsyncLoadingWithWRM()) {
            this.enableAsyncLoadingWithWRM(compiler);
        }

        this.assetNames = new Map();

        // Generate a 1:1 mapping from original filenames to compiled filenames
        compiler.hooks.compilation.tap('wrm plugin setup phase', compilation => {
            compilation.hooks.normalModuleLoader.tap('wrm plugin - normal module', (loaderContext, module) => {
                const { emitFile } = loaderContext;
                loaderContext.emitFile = (name, content, sourceMap) => {
                    const originalName = module.userRequest;
                    this.assetNames.set(originalName, name);

                    return emitFile.call(module, name, content, sourceMap);
                };
            });
        });

        // When the compiler is about to emit files, we jump in to produce our resource descriptors for the WRM.
        compiler.hooks.emit.tapAsync('wrm plugin emit phase', (compilation, callback) => {
            const pathPrefix = WRMHelpers.extractPathPrefixForXml(compiler.options);
            const appResourceGenerator = new AppResources(
                this.assetUUID,
                this.assetNames,
                this.options,
                compiler,
                compilation
            );
            const testResourcesGenerator = new QUnitTestResources(this.assetUUID, this.options, compiler, compilation);

            const webResources = [];

            const resourceDescriptors = XMLFormatter.createResourceDescriptors(
                this.options.standalone
                    ? appResourceGenerator.getEntryPointsResourceDescriptors()
                    : appResourceGenerator.getResourceDescriptors(),
                this.options.transformationMap,
                pathPrefix,
                this.options.assetContentTypes,
                this.options.standalone
            );
            webResources.push(resourceDescriptors);

            if (this.options.__testGlobs__ && !this.options.watch) {
                testResourcesGenerator.injectQUnitShim();
                const testResourceDescriptors = XMLFormatter.createTestResourceDescriptors(
                    testResourcesGenerator.createAllFileTestWebResources(),
                    this.options.transformationMap
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

            if (this.options.watch && this.options.watchPrepare) {
                const outputPath = compiler.options.output.path;
                const entrypointDescriptors = appResourceGenerator.getResourceDescriptors();
                const redirectDescriptors = entrypointDescriptors
                    .map(c => c.resources)
                    .reduce(flattenReduce, [])
                    .filter(res => path.extname(res) === '.js')
                    .map(r => ({ fileName: r, writePath: path.join(outputPath, r) }));

                compiler.hooks.done.tap('add watch mode modules', () => {
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
