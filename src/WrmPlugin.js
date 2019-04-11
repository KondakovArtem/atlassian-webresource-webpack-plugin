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
const once = require('lodash.once');
const urlJoin = require('url-join');

const {
    createQUnitResourceDescriptors,
    createResourceDescriptors,
    createTestResourceDescriptors,
} = require('./helpers/web-resource-generator');
const { extractPathPrefixForXml } = require('./helpers/options-parser');
const { providedDependencies } = require('./helpers/provided-dependencies');

const ProvidedExternalDependencyModule = require('./webpack-modules/ProvidedExternalDependencyModule');
const WrmDependencyModule = require('./webpack-modules/WrmDependencyModule');
const WrmResourceModule = require('./webpack-modules/WrmResourceModule');
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
     * @param {String} options.wrmManifestPath - Optional path to the WRM manifest file where this plugin stores the mapping of modules to generated web-resources. e.g.: {\n\t"my-entry": "com.example.app:entrypoint-my-entry"\n}. Useful if you set { output: { library, libraryTarget } } in your webpack config, to use your build result as provided dependencies for other builds.
     * @param {String} options.assetContentTypes - Specific content-types to be used for certain asset types. Will be added as '<param name="content-type"...' to the resource of the asset.
     * @param {Object} options.resourceParamMap - Map of parameters to be added to specific file types.
     * @param {String} [options.locationPrefix=''] - Specify the sub-directory for all web-resource location values.
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
                resourceParamMap: {
                    svg: [
                        {
                            name: 'content-type',
                            value: 'image/svg+xml',
                        },
                    ],
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

        this.getAssetsUUID = once(this.getAssetsUUID.bind(this));
    }

    /**
     * Generate an asset uuid per build - this is used to ensure we have a new "cache" for our assets per build.
     * As JIRA-Server does not "rebuild" too often, this can be considered reasonable.
     *
     * @param   {Boolean}   isProduction    Is webpack running in production mode
     * @returns {String}                    Unique hash ID
     */
    getAssetsUUID(isProduction) {
        return isProduction ? uuidv4Gen() : 'DEV_PSEUDO_HASH';
    }

    ensureTransformationsAreUnique(transformations) {
        return Object.keys(transformations).reduce((result, key) => {
            result[key] = Array.from(new Set(transformations[key]));

            return result;
        }, {});
    }

    checkConfig(compiler) {
        compiler.hooks.afterEnvironment.tap('Check Config', () => {
            const outputOptions = compiler.options.output;

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
        const isProductionMode = WebpackHelpers.isRunningInProductionMode(compiler);

        compiler.hooks.compilation.tap('OverwritePublicPath Compilation', compilation => {
            compilation.mainTemplate.hooks.requireExtensions.tap(
                'OverwritePublicPath Require-Extensions',
                standardScript => {
                    return `${standardScript}
if (typeof AJS !== "undefined") {
    ${compilation.mainTemplate.requireFn}.p = AJS.contextPath() + "/download/resources/${
                        this.options.pluginKey
                    }:assets-${this.getAssetsUUID(isProductionMode)}/";
}
`;
                }
            );
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
            compilation.mainTemplate.hooks.requireEnsure.tap(
                'enable async loading with wrm - jsonp-script',
                (source, chunk, hash) => {
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
    if(installedChunks[chunkId] === 0) { // 0 means "already installed".
        return Promise.resolve();
    }

    if (installedChunks[chunkId]) {
        return installedChunks[chunkId][2];
    }

    return Promise.all([
        new Promise(function(resolve, reject) {
            installedChunks[chunkId] = [resolve, reject];
        }),
        new Promise(function(resolve, reject) {
            WRM.require('wrc!${this.options.pluginKey}:' + chunkId, function(){
                resolve();
            })
        }),
    ]);
}`;
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

        const isProductionMode = WebpackHelpers.isRunningInProductionMode(compiler);
        const assetsUUID = this.getAssetsUUID(isProductionMode);

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
            const pathPrefix = extractPathPrefixForXml(this.options.locationPrefix);
            const appResourceGenerator = new AppResources(
                assetsUUID,
                this.assetNames,
                this.options,
                compiler,
                compilation
            );
            const testResourcesGenerator = new QUnitTestResources(assetsUUID, this.options, compiler, compilation);

            const webResources = [];
            const entryPointsResourceDescriptors = appResourceGenerator.getEntryPointsResourceDescriptors();
            const resourceParamMap = Object.assign({}, this.options.resourceParamMap);

            // `assetContentTypes` is DEPRECATED. This code block ensures we're backwards compatible, by applying the
            // specified `assetContentTypes` into the `resourceParamMap`.
            // This should be removed once we get rid of `assetContentTypes` once and for all.
            if (this.options.assetContentTypes) {
                logger.warn(
                    `Option 'assetContentTypes' is deprecated and will be removed in a future version. Use 'resourceParamMap' instead. See README for further instructions.`
                );

                Object.keys(this.options.assetContentTypes).forEach(fileExtension => {
                    const contentType = this.options.assetContentTypes[fileExtension];

                    if (!resourceParamMap[fileExtension]) {
                        resourceParamMap[fileExtension] = [];
                    }

                    const params = resourceParamMap[fileExtension];

                    if (params.find(param => param.name === 'content-type')) {
                        logger.warn(
                            `There's already a 'content-type' defined for '${fileExtension}' in 'resourceParamMap'. Please stop using 'assetContentTypes'`
                        );
                    } else {
                        params.push({ name: 'content-type', value: contentType });
                    }
                });
            }

            const resourceDescriptors = createResourceDescriptors(
                this.options.standalone
                    ? entryPointsResourceDescriptors
                    : appResourceGenerator.getResourceDescriptors(),
                this.options.transformationMap,
                pathPrefix,
                resourceParamMap,
                this.options.standalone
            );
            webResources.push(resourceDescriptors);

            if (this.options.__testGlobs__ && !this.options.watch) {
                testResourcesGenerator.injectQUnitShim();
                const testResourceDescriptors = createTestResourceDescriptors(
                    testResourcesGenerator.createAllFileTestWebResources(),
                    this.options.transformationMap
                );
                const qUnitTestResourceDescriptors = createQUnitResourceDescriptors(
                    testResourcesGenerator.getTestFiles()
                );

                webResources.push(testResourceDescriptors, qUnitTestResourceDescriptors);
            }

            const outputPath = compiler.options.output.path;

            const xmlDescriptors = PrettyData.xml(`<bundles>${webResources.join('')}</bundles>`);
            const xmlDescriptorWebpackPath = path.relative(outputPath, this.options.xmlDescriptors);

            compilation.assets[xmlDescriptorWebpackPath] = {
                source: () => new Buffer(xmlDescriptors),
                size: () => Buffer.byteLength(xmlDescriptors),
            };

            if (this.options.wrmManifestPath) {
                const { library, libraryTarget } = compiler.options.output;
                if (!library || !libraryTarget) {
                    logger.error(
                        'Can only use wrmManifestPath in conjunction with output.library and output.libraryTarget'
                    );
                    return;
                }

                if (libraryTarget !== 'amd') {
                    logger.error(
                        `Could not create manifest mapping. LibraryTarget '${libraryTarget}' is not supported. Use 'amd'`
                    );
                    return;
                }

                const wrmManifestMapping = entryPointsResourceDescriptors
                    .filter(({ attributes }) => attributes.moduleId)
                    .reduce((result, { attributes: { key: resourceKey, moduleId } }) => {
                        const libraryName = compilation.mainTemplate.getAssetPath(compiler.options.output.library, {
                            chunk: { name: moduleId },
                        });

                        result[moduleId] = providedDependencies(
                            this.options.pluginKey,
                            resourceKey,
                            `require('${libraryName}')`,
                            libraryName
                        );

                        return result;
                    }, {});
                const wrmManifestJSON = JSON.stringify({ providedDependencies: wrmManifestMapping }, null, 4);
                const wrmManifestWebpackPath = path.relative(outputPath, this.options.wrmManifestPath);

                compilation.assets[wrmManifestWebpackPath] = {
                    source: () => new Buffer(wrmManifestJSON),
                    size: () => Buffer.byteLength(wrmManifestJSON),
                };
            }

            if (this.options.watch && this.options.watchPrepare) {
                const entrypointDescriptors = appResourceGenerator.getResourceDescriptors();
                const redirectDescriptors = entrypointDescriptors
                    .map(c => c.resources)
                    .reduce(flattenReduce, [])
                    .filter(res => path.extname(res) === '.js')
                    .map(r => ({ fileName: r, writePath: path.join(outputPath, r) }));

                compiler.hooks.done.tap('add watch mode modules', () => {
                    mkdirp.sync(path.dirname(this.options.xmlDescriptors));
                    fs.writeFileSync(this.options.xmlDescriptors, xmlDescriptors, 'utf8');

                    const generateAssetCall = file => {
                        const pathName = urlJoin(compiler.options.output.publicPath, file);

                        const appendScript = `
var script = document.createElement('script');
script.src = '${pathName}';
script.async = false;
document.head.appendChild(script);`.trim();

                        if (this.options.useDocumentWriteInWatchMode) {
                            return `
!function(){
    if (document.readyState === "loading") {
        document.write('<script src="${pathName}"></script>')
    } else {
        ${appendScript}
    }
}();
`;
                        }

                        return `!function() { ${appendScript} }();`;
                    };

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
