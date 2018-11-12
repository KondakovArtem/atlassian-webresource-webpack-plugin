const path = require('path');

const logger = require('./logger');

module.exports = class WRMHelpers {
    static stringifyAttributes(attributes) {
        if (!attributes) {
            return '';
        }

        return (
            ' ' +
            Object.keys(attributes)
                .map(key => `${key}="${attributes[key]}"`)
                .join(' ')
        );
    }

    static renderElement(name, attributes, children) {
        if (!children) {
            return `<${name}${attributes}/>`;
        }
        return `<${name}${attributes}>${children}</${name}>`;
    }

    static getContextForEntry(entry, contextMap) {
        const contexts = [].concat(entry).concat(contextMap[entry]);
        const validContexts = contexts.filter(context => context && typeof context === 'string');
        return validContexts;
    }

    static getWebresourceAttributesForEntry(entry, webresourceKeyMap) {
        const wrKey = webresourceKeyMap[entry];
        const wrKeyType = typeof wrKey;
        if (wrKeyType === 'object' && typeof wrKey.key === 'string') {
            return { key: wrKey.key, name: wrKey.name };
        }
        if (!wrKey || wrKeyType !== 'string') {
            return { key: `entrypoint-${entry}` };
        }
        return { key: wrKey };
    }

    static getConditionForEntry(entry, conditionMap) {
        return conditionMap[entry];
    }

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
};
