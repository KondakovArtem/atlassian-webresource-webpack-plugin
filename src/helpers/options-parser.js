const path = require('path');

const pathSeparatorRegex = new RegExp(`^\\${path.sep}|\\${path.sep}$`, 'g');

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
    extractPathPrefixForXml,
};
