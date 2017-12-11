const DllModule = require('webpack/lib/DllModule');
const RawSource = require('webpack-sources').RawSource;

/**
 * This module type allows inclusion of special dependencies in the webpack compilation process
 * that ultimately output nothing in the compiled bundles.
 *
 * This is of use when including certain file types with no associated loader in the compilation process,
 * as is the case with things like Atlassian Soy templates.
 */
class EmptyExportsModule extends DllModule {
    constructor(dependency, type) {
        super(null, [], dependency, type);
        this._dependency = dependency;
    }

    chunkCondition() {
        return true;
    }

    source() {
        return new RawSource('module.exports = undefined;');
    }
}

module.exports = EmptyExportsModule;
