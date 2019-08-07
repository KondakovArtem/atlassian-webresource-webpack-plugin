/**
 *
 * @param {String} pluginKey
 * @param {String} resourceKey
 * @param {String} importVar
 * @param {String} importAmd
 * @return {{dependency: string, import: {var: *, amd: *}}}
 */
function buildProvidedDependency(pluginKey, resourceKey, importVar, importAmd) {
    return {
        dependency: `${pluginKey}:${resourceKey}`,
        import: {
            var: importVar,
            amd: importAmd,
        },
    };
}

module.exports = {
    buildProvidedDependency,
};
