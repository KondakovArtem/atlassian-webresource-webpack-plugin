const DllModule = require("webpack/lib/DllModule");

module.exports = class ProvidedDllModule extends DllModule {
    constructor(dependency, type) {
        super(null, [], dependency, type);
        this._dependency = dependency;
    }

    chunkCondition() {
        return true;
    }

    getDependency() {
        return this._dependency;
    }

}