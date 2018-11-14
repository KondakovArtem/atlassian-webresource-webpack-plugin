const EmptyExportsModule = require('./EmptyExportsModule');

module.exports = class extends EmptyExportsModule {
    constructor(dependency, type, pluginKey) {
        super(dependency, type);
        this._dependency = dependency.startsWith(':') ? pluginKey + dependency : dependency;
    }

    getDependency() {
        return this._dependency;
    }
};
