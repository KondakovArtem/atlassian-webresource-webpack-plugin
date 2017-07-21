const DllModule = require("webpack/lib/DllModule");
const RawSource = require("webpack-sources").RawSource;

module.exports = class ProvidedDllModule extends DllModule {
    constructor(dependency, type) {
        super(null, [], dependency, type);
        this._dependency = dependency;
    }

    chunkCondition() {
        return true;
    }

    source() {
        return new RawSource("module.exports = undefined;");
    }

    getDependency() {
        return this._dependency;
    }

}