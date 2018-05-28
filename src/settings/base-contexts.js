const CROSS_PLATFORM_BASE_CONTEXTS = [
    'com.atlassian.plugins.atlassian-plugins-webresource-plugin:data',
    'com.atlassian.plugins.atlassian-plugins-webresource-plugin:context-path',
];

let amdProvider;

module.exports.setAmdProvider = providedAmdProvider => (amdProvider = providedAmdProvider);

module.exports.getBaseContexts = () => [amdProvider, ...CROSS_PLATFORM_BASE_CONTEXTS];
