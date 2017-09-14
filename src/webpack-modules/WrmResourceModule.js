const EmptyExportsModule = require("./EmptyExportsModule");

module.exports = class extends EmptyExportsModule {
    constructor(resourceNameAndLocationPair, target) {
        super(resourceNameAndLocationPair, target);
        this._resource = resourceNameAndLocationPair.split('!');
    }

    getResourcePair() {
        return this._resource;
    }
};
