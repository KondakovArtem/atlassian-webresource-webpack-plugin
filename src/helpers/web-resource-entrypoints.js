const { parseWebResourceAttributes } = require('./web-resource-parser');

/**
 * @param {String} entry
 * @param {Map<String, Array<String>>} contextMap
 * @param {Boolean} addEntrypointNameAsContext
 * @returns {Array<String>}
 */
function getContextForEntry(entry, contextMap, addEntrypointNameAsContext) {
    const contexts = [].concat(contextMap.get(entry));
    if (addEntrypointNameAsContext) {
        contexts.unshift(entry);
    }
    return contexts.filter(context => context && typeof context === 'string');
}

/**
 * @param {String} entry
 * @param {Map<String, String>} webresourceKeyMap
 * @returns {WebResourceAttributes}
 */
function getWebresourceAttributesForEntry(entry, webresourceKeyMap) {
    const wrKey = webresourceKeyMap.get(entry);

    // Create the default attribute values
    let attrs = { key: `entrypoint-${entry}`, moduleId: entry };

    // Extend the attributes with parsed, valid values
    if (typeof wrKey === 'object') {
        attrs = Object.assign(attrs, parseWebResourceAttributes(wrKey));
    }

    // Override the key if a non-empty string is provided
    if (typeof wrKey === 'string') {
        attrs = Object.assign(attrs, parseWebResourceAttributes({ key: wrKey }));
    }

    return attrs;
}

/**
 * @param {String} entry
 * @param {Map<String, Object>} conditionMap
 * @returns {*}
 */
function getConditionForEntry(entry, conditionMap) {
    return conditionMap.get(entry);
}

/**
 * Retrieves the list of data providers for given entrypoint
 *
 * @param {String} entrypoint - webpack entrypoint key
 * @param {Map<String, DataProvider[]>} dataProvidersMap - All data providers from plugin options
 * @return {DataProvider[]} - List of data providers for given entry point
 */
function getDataProvidersForEntry(entrypoint, dataProvidersMap) {
    return dataProvidersMap.get(entrypoint) || [];
}

module.exports = {
    getContextForEntry,
    getConditionForEntry,
    getWebresourceAttributesForEntry,
    getDataProvidersForEntry,
};
