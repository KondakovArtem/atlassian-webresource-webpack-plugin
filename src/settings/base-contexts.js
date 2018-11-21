const CROSS_PLATFORM_BASE_CONTEXTS = [
    'com.atlassian.plugins.atlassian-plugins-webresource-rest:web-resource-manager',
    'com.atlassian.plugins.atlassian-plugins-webresource-plugin:context-path',
];

module.exports = {
    getBaseContexts() {
        return CROSS_PLATFORM_BASE_CONTEXTS;
    },
};
