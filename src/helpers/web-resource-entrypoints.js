const { parseWebResourceAttributes } = require('./web-resource-parser');
const { sanitizeKey } = require('./web-resource-key');

function getContextForEntry(entry, contextMap) {
    const contexts = [].concat(entry).concat(contextMap[entry]);
    const validContexts = contexts.filter(context => context && typeof context === 'string');
    return validContexts;
}

/**
 * @param {String} entry
 * @param {Object} webresourceKeyMap
 * @returns {WebResourceAttributes}
 */
function getWebresourceAttributesForEntry(entry, webresourceKeyMap) {
    const wrKey = webresourceKeyMap[entry];

    // Create the default attribute values
    let attrs = { key: sanitizeKey(`entrypoint-${entry}`), moduleId: entry };

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

function getConditionForEntry(entry, conditionMap) {
    return conditionMap[entry];
}

module.exports = {
    getContextForEntry,
    getConditionForEntry,
    getWebresourceAttributesForEntry,
};
