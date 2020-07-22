const assert = require('assert');
const path = require('path');
const { createHash } = require('crypto');
const PrettyData = require('pretty-data').pd;
const uuidv4Gen = require('uuid/v4');
const fs = require('fs');
const mkdirp = require('mkdirp');
const once = require('lodash/once');
const urlJoin = require('url-join');
const unionBy = require('lodash/unionBy');
const isObject = require('lodash/isObject');

const {
    createQUnitResourceDescriptors,
    createResourceDescriptors,
    createTestResourceDescriptors,
} = require('./helpers/web-resource-generator');
const { toMap, extractPathPrefixForXml } = require('./helpers/options-parser');
const { buildProvidedDependency } = require('./helpers/provided-dependencies');
const { addBaseDependency } = require('./settings/base-dependencies');

const ProvidedExternalDependencyModule = require('./webpack-modules/ProvidedExternalDependencyModule');
const WrmDependencyModule = require('./webpack-modules/WrmDependencyModule');
const WrmResourceModule = require('./webpack-modules/WrmResourceModule');
const WebpackHelpers = require('./WebpackHelpers');
const WebpackRuntimeHelpers = require('./WebpackRuntimeHelpers');
const logger = require('./logger');
const QUnitTestResources = require('./QUnitTestResources');
const AppResources = require('./AppResources');
const flattenReduce = require('./flattenReduce');
const mergeMaps = require('./mergeMaps');

const { builtInProvidedDependencies } = require('./defaults/builtInProvidedDependencies');

const defaultResourceParams = new Map().set('svg', [
    {
        name: 'content-type',
        value: 'image/svg+xml',
    },
]);

const defaultTransformations = new Map()
    .set('js', ['jsI18n'])
    .set('soy', ['soyTransformer', 'jsI18n'])
    .set('less', ['lessTransformer']);

const DEFAULT_DEV_ASSETS_HASH = 'DEV_PSEUDO_HASH';

class WrmPlugin {
    static extendTransformations(values) {
        return mergeMaps(defaultTransformations, toMap(values), (val, key, map) => {
            const oldVals = map.get(key);
            const newVals = []
                .concat(oldVals)
                .concat(val)
                .filter(v => !!v);
            return map.set(key, newVals);
        });
    }

    /**
     * A Webpack plugin that takes the compilation tree and creates <web-resource> XML definitions that mirror the
     * dependency graph.
     *
     * This plugin will:
     *
     * - generate <web-resource> definitions for each entrypoint, along with additional <web-resource> definitions for
     *   and appropriate dependencies on all chunks generated during compilation.
     * - Add <dependency> declarations to each generated <web-resource> as appropriate, both for internal and external
     *   dependencies in the graph.
     * - Add appropriate metadata to the <web-resource> definition, such as appropriate <context>s,
     *   enabled/disabled state, and more.
     *
     * @param {Object} options - options passed to WRMPlugin
     * @param {String} options.pluginKey - The fully qualified plugin key. e.g.: com.atlassian.jira.plugins.my-jira-plugin
     * @param {String} options.xmlDescriptors - Path to the directory where this plugin stores the descriptors about this plugin, used by the WRM to load your frontend code.
     *
     * @param {Map<String, Object>} [options.providedDependencies] - Map of ES6/AMD module identifiers to their related WRM module keys and JavaScript import values (read: webpack external dependency definition). If this module identifier is imported or required somewhere in the compiled code, it will not be bundled, but instead replaced with the specified external dependency placeholder.
     *
     * @param {String} [options.locationPrefix=''] - Specify the sub-directory for all web-resource location values.
     * @param {String} [options.wrmManifestPath] - Path to the WRM manifest file where this plugin stores the mapping of modules to generated web-resources. e.g.: `{"my-entry": "com.example.app:entrypoint-my-entry"}`. Useful if you set { output: { library, libraryTarget } } in your webpack config, to use your build result as provided dependencies for other builds.
     *
     * @param {Object} [options.assetContentTypes] - [DEPRECATED - use {@param options.resourceParamMap} instead] Specific content-types to be used for certain asset types. Will be added as '<param name="content-type"...' to the resource of the asset.
     * @param {Map<String, Object>} [options.conditionMap] - Conditions to be applied to the specified entry-point.
     * @param {Map<String, Array<String>>} [options.contextMap] - One or more "context"s to which an entrypoint will be added. e.g.: `{"my-entry": ["my-plugin-context", "another-context"]}`
     * @param {Map<String, Array<Object>>} [options.resourceParamMap] - Parameters to be added to specific file types.
     * @param {Map<String, Array<String>>} [options.transformationMap] - Transformations to be applied to the specified file-types.
     * @param {Map<String, String>} [options.webresourceKeyMap] - An explicit name for the web-resource generated per entry point. e.g.: `{"my-entry": "legacy-webresource-name"}`.
     * @param {String} [options.devAssetsHash] - Custom hash used in development environment resources name.
     *
     * @param {Boolean} [options.addEntrypointNameAsContext=true] - Guarantees each entrypoint will be given a context matching its name. Use with caution; this can adversely affect page weight and may conflict with other plugins and feature code.
     * @param {Boolean} [options.addAsyncNameAsContext=true] - Adds the name of the async chunk as a context prefixed by `async-chunk-`. Will only do so if a webpackChunkName is set.
     * @param {Boolean} [options.watch=false] - Trigger watch mode - this requires webpack-dev-server and will redirect requests to the entrypoints to the dev-server that must be running under webpack's `options.output.publicPath`.
     * @param {Boolean} [options.watchPrepare=false] - In conjunction with watch mode - indicates that only "redirects" to a webserver should be build in this run.
     * @param {Boolean} [options.standalone=false] - Build standalone web-resources - assumes no transformations, other chunks or base contexts are needed.
     * @param {Boolean} [options.noWRM=false] - Do not add any WRM specifics to the webpack runtime to allow development on a greenfield.
     * @param {Boolean} [options.verbose=false] - Indicate if log output should be verbose.
     *
     * @param {Map<String, DataProvider[]>} [options.dataProvidersMap] - A list of data providers that will be added to the entry point e.g.: `{"my-entry": [{ key: "data-provider-key", class: "my.data.provider.JavaClass" }]}`
     *
     * @constructs
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

        // pull out our options
        this.options = Object.assign(
            {
                addEntrypointNameAsContext: true,
                addAsyncNameAsContext: true,
                conditionMap: new Map(),
                dataProvidersMap: new Map(),
                contextMap: new Map(),
                webresourceKeyMap: new Map(),
                providedDependencies: new Map(),
                verbose: false,
                resourceParamMap: defaultResourceParams,
                transformationMap: defaultTransformations,
            },
            options
        );

        logger.setVerbose(this.options.verbose);

        // convert various maybe-objects to maps
        [
            'providedDependencies',
            'conditionMap',
            'contextMap',
            'resourceParamMap',
            'webresourceKeyMap',
            'dataProvidersMap',
        ].forEach(prop => (this.options[prop] = toMap(this.options[prop])));

        // make sure various maps contain only unique items
        this.options.resourceParamMap = this.ensureResourceParamsAreUnique(this.options.resourceParamMap);
        this.options.transformationMap = this.ensureTransformationsAreUnique(this.options.transformationMap);
        this.options.providedDependencies = this.ensureProvidedDependenciesAreUnique(this.options.providedDependencies);
        this.options.dataProvidersMap = this.ensureDataProvidersMapIsValid(this.options.dataProvidersMap);

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
        return isProduction ? uuidv4Gen() : this.getDevAssetHash();
    }

    getDevAssetHash() {
        return this.options.devAssetsHash ? this.options.devAssetsHash : DEFAULT_DEV_ASSETS_HASH;
    }

    ensureTransformationsAreUnique(transformations) {
        const results = toMap(transformations);
        results.forEach((val, key, map) => {
            const values = [].concat(val).filter(v => !!v);
            map.set(key, Array.from(new Set(values)));
        });
        return results;
    }

    ensureResourceParamsAreUnique(params) {
        const results = toMap(params);
        results.forEach((val, key, map) => {
            const values = [].concat(val).filter(v => !!v);
            map.set(key, unionBy(values.reverse(), 'name').reverse());
        });
        return results;
    }

    ensureProvidedDependenciesAreUnique(providedDependencies) {
        const result = new Map(builtInProvidedDependencies);

        for (let [name, providedDependency] of providedDependencies) {
            if (result.has(name)) {
                continue;
            }

            result.set(name, providedDependency);
        }

        logger.log('Using provided dependencies', Array.from(result));

        return result;
    }

    /**
     * Filters and validates the data providers option
     *
     * @param {Map<String, DataProvider[]>} dataProvidersMap
     * @return {Map<String, DataProvider[]>}
     */
    ensureDataProvidersMapIsValid(dataProvidersMap) {
        const map = new Map();
        const requiredKeys = ['key', 'class'];

        for (const [entryPoint, dataProviders] of dataProvidersMap) {
            if (!Array.isArray(dataProviders)) {
                logger.error(
                    `The value of data providers for "${entryPoint}" entry point should be an array of data providers.`,
                    { entryPoint, dataProviders }
                );

                continue;
            }

            const validDataProviders = [];

            for (const dataProvider of dataProviders) {
                const keys = isObject ? Object.keys(dataProvider) : [];
                const isValidShape = requiredKeys.every(key => keys.includes(key));

                if (!isValidShape) {
                    logger.error(
                        `The data provider shape for "${entryPoint}" entry point doesn't include required keys: ${requiredKeys.concat(
                            ', '
                        )}.`,
                        { entryPoint, dataProvider }
                    );

                    continue;
                }

                const { key, class: providerClass } = dataProvider;

                if (!key || !providerClass) {
                    logger.error(
                        `The data provider shape for "${entryPoint}" entry point contains missing or empty values.`,
                        {
                            entryPoint,
                            key,
                            class: providerClass,
                        }
                    );

                    continue;
                }

                validDataProviders.push({
                    key,
                    class: providerClass,
                });
            }

            if (validDataProviders.length) {
                map.set(entryPoint, validDataProviders);
            }
        }

        return map;
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
                    // Ensure the `AJS.contextPath` function is available at runtime.
                    addBaseDependency('com.atlassian.plugins.atlassian-plugins-webresource-plugin:context-path');
                    const uuid = this.getAssetsUUID(isProductionMode);

                    // Add the public path extension to the webpack module runtime.
                    return `${standardScript}
if (typeof AJS !== "undefined") {
    ${compilation.mainTemplate.requireFn}.p = AJS.contextPath() + "/s/${uuid}/_/download/resources/${
                        this.options.pluginKey
                    }:assets-${uuid}/";
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
                    // Ensure the WRM.require function is available at runtime.
                    // TODO: understand how to set this data on chunk "properly" so that
                    //  our normalModuleFactory hook will pick it up and generate this dep for us.
                    chunk.needsWrmRequire = true;

                    // Add the WRM async loader in to the webpack module runtime.
                    return `
if(installedChunks[chunkId] === 0) { // 0 means "already installed".
    return Promise.resolve();
}

if (installedChunks[chunkId]) {
    return installedChunks[chunkId][2];
}

promises.push(
    new Promise(function(resolve, reject) {
        installedChunks[chunkId] = [resolve, reject];
    }),
    new Promise(function(resolve, reject) {
        WRM.require('wrc!${this.options.pluginKey}:' + chunkId).then(resolve, reject);
    })
);
return installedChunks[chunkId][2] = Promise.all(promises);
`;
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
            const resourceParamMap = this.options.resourceParamMap;

            // `assetContentTypes` is DEPRECATED. This code block ensures we're backwards compatible, by applying the
            // specified `assetContentTypes` into the `resourceParamMap`.
            // This should be removed once we get rid of `assetContentTypes` once and for all.
            if (this.options.assetContentTypes) {
                logger.warn(
                    `Option 'assetContentTypes' is deprecated and will be removed in a future version. Use 'resourceParamMap' instead. See README for further instructions.`
                );

                Object.keys(this.options.assetContentTypes).forEach(fileExtension => {
                    const contentType = this.options.assetContentTypes[fileExtension];

                    if (!resourceParamMap.has(fileExtension)) {
                        resourceParamMap.set(fileExtension, []);
                    }

                    const params = resourceParamMap.get(fileExtension);

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

                        result[moduleId] = buildProvidedDependency(
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
script.crossOrigin = 'anonymous';
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
