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

const webresourcePluginName = 'com.atlassian.plugins.atlassian-plugins-webresource-plugin';
const webresourceDep = buildProvidedDependency.bind(undefined, webresourcePluginName);

const builtInProvidedDependencies = new Map()
    .set(
        'wrm/require',
        buildProvidedDependency(
            'com.atlassian.plugins.atlassian-plugins-webresource-rest',
            'web-resource-manager',
            'WRM.require',
            'wrm/require'
        )
    )
    .set('wrm/context-path', webresourceDep('context-path', 'WRM.contextPath', 'wrm/context-path'))
    .set('wrm/data', webresourceDep('data', 'WRM.data', 'wrm/data'))
    .set('wrm/format', webresourceDep('format', 'WRM.format', 'wrm/format'));

module.exports = {
    buildProvidedDependency,
    builtInProvidedDependencies,
};
