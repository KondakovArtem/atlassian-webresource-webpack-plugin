const isAmd = ['amd', 'amd-require', 'commonjs', 'commonjs2', 'umd', 'umd2', 'system'];
const isVar = ['var', 'assign', 'global', 'window', 'self', 'root'];

/**
 *
 * @param {String} pluginKey
 * @param {String} resourceKey
 * @param {String} importVar
 * @param {String} importAmd
 * @return {{dependency: string, import: {var: *, amd: *}}}
 */
function buildProvidedDependency(pluginKey, resourceKey, importVar, importAmd) {
    const declaration = {
        dependency: `${pluginKey}:${resourceKey}`,
        import: {},
    };
    if (importVar) {
        isVar.forEach(type => (declaration.import[type] = importVar));
    }
    if (importAmd) {
        isAmd.forEach(type => (declaration.import[type] = importAmd));
    }
    return declaration;
}

module.exports = {
    buildProvidedDependency,
};
