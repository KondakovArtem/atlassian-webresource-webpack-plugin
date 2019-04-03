const path = require('path');

const pathSeparatorRegex = new RegExp(`^\\${path.sep}|\\${path.sep}$`, 'g');

/**
 * Converts an object in to a Map.
 * @param {Object} original
 * @returns {Map} a map with key-value pairs from the object.
 * returns an empty map if the original value was falsy or not an object.
 */
function toMap(original) {
    if (original instanceof Map) {
        return original;
    }
    return original && typeof original === 'object' ? new Map(Object.entries(original)) : new Map();
}

function extractPathPrefixForXml(pathPrefix) {
    if (!pathPrefix || pathPrefix === '' || pathPrefix === '/') {
        return '';
    }

    // remove leading/trailing path separator
    const withoutLeadingTrailingSeparators = pathPrefix.replace(pathSeparatorRegex, '');
    // readd trailing slash - this time OS independent always a "/"
    return withoutLeadingTrailingSeparators + '/';
}

module.exports = {
    toMap,
    extractPathPrefixForXml,
};
