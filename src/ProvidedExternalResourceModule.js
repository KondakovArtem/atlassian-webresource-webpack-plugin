const ProvidedDllModule = require("./ProvidedDllModule");

module.exports = class ProvidedExternalResourceModule extends ProvidedDllModule {
    constructor(resourceNameAndLocationPair, target) {
        super(null, target);
        this._resource = resourceNameAndLocationPair.split('!');
    }

    getResourcePair() {
        return this._resource;
    }
};
