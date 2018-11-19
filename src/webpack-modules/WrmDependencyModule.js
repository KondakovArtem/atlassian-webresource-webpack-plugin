const EmptyExportsModule = require('./EmptyExportsModule');

module.exports = class extends EmptyExportsModule {
    constructor(dependency, type, pluginKey) {
        super(dependency, type);
        this._dependency = dependency.includes(':') ? dependency : `${pluginKey}:${dependency}`;
    }

    getDependency() {
        return this._dependency;
    }
};
