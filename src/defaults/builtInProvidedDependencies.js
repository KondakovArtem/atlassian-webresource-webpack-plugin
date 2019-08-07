const { buildProvidedDependency } = require('../helpers/provided-dependencies');

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
    builtInProvidedDependencies,
};
