const ExternalModule = require("webpack/lib/ExternalModule");

/**
 * ProvidedExternalModule ensures that the `chunkCondition` is true to allow proper asyncChunk context handling
 * ExternalModules can be defined in different ways. Some of them require the external module to be loaded in the entry point.
 * This is generally not bad as it doesnt cost anything. However the WRM Plugin relies on ExternalModules to specify provided dependencies.
 * These provided dependencies are then added to the context of the chunk in which they occur. Async chunks should therefore 
 * have their own dependencies to make the entrypoint as small as possible.
 * ProvidedExternalModule ensures that.
 */
module.exports = class ProvidedExternalModule extends ExternalModule {
    constructor(request, dependency, type) {
        super(request, type);
        this._request = request;
        this._dependency = dependency;
    }

    chunkCondition() {
        return true;
    }

    getDependency() {
        return this._dependency;
    }

}