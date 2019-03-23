const path = require('path');

const pathSeparatorRegex = new RegExp(`^\\${path.sep}|\\${path.sep}$`, 'g');

function toMap(original) {
    if (original instanceof Map) {
        return original;
    }
    const map = new Map();
    if (typeof original === 'object') {
        Object.keys(original).forEach(key => {
            map.set(key, original[key]);
        });
    }
    return map;
}

function asMap(options, prop) {
    if (prop && prop.length) {
        options[prop] = toMap(options[prop]);
        return;
    }
    return toMap(options);
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
    asMap,
    extractPathPrefixForXml,
};
