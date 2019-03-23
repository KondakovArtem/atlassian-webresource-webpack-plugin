const { parseWebResourceAttributes } = require('./web-resource-parser');

/**
 * @param {String} entry
 * @param {Map<String, Array<String>>} contextMap
 * @returns {Array<String>}
 */
function getContextForEntry(entry, contextMap) {
    const contexts = [].concat(entry).concat(contextMap.get(entry));
    const validContexts = contexts.filter(context => context && typeof context === 'string');
    return validContexts;
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

module.exports = {
    getContextForEntry,
    getConditionForEntry,
    getWebresourceAttributesForEntry,
};
