const path = require('path');

const logger = require('./logger');

class Helpers {
    static extractPathPrefixForXml(options) {
        const outputPath = options.output.path;
        // get everything "past" the /target/classes
        const pathPrefix = outputPath.split(path.join('target', 'classes'))[1];
        if (pathPrefix === '' || pathPrefix === '/') {
            return '';
        } else if (pathPrefix === undefined) {
            logger.warn(`
******************************************************************************
Path prefix for resources could not be extracted as the output path specified 
in webpack does not point to somewhere in "target/classes". 
This is likely to cause problems, please check your settings!

Not adding any path prefix - WRM will probably not be able to find your files!
******************************************************************************
`);
            return '';
        }

        // remove leading/trailing path separator
        const withoutLeadingTrailingSeparators = pathPrefix.replace(
            new RegExp(`^\\${path.sep}|\\${path.sep}$`, 'g'),
            ''
        );
        // readd trailing slash - this time OS independent always a "/"
        return withoutLeadingTrailingSeparators + '/';
    }
}

module.exports = {
    extractPathPrefixForXml: Helpers.extractPathPrefixForXml,
};
