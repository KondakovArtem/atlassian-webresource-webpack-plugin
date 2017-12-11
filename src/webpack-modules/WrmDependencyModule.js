const EmptyExportsModule = require('./EmptyExportsModule');

module.exports = class extends EmptyExportsModule {
    constructor(dependency, type) {
        super(dependency, type);
        this._dependency = dependency;
    }

    getDependency() {
        return this._dependency;
    }
};
