const DllModule = require("webpack/lib/DllModule");
const RawSource = require("webpack-sources").RawSource;

module.exports = class extends DllModule {
    constructor(resourceNameAndLocationPair, target) {
        super(null, [], resourceNameAndLocationPair, target);
        this._resource = resourceNameAndLocationPair.split('!');
    }

    chunkCondition() {
        return true;
    }

    source() {
        return new RawSource("module.exports = undefined;");
    }

    getResourcePair() {
        return this._resource;
    }
};
