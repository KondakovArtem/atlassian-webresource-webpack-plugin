const { parseString } = require('./string');

/**
 * @param {Object} data - key value pairs of potentially invalid metadata for a web-resource.
 * @returns {WebResourceAttributes} a valid set of metadata for a web-resource.
 */
function parseWebResourceAttributes(data = {}) {
    const attributes = {};
    // Only parse objects.
    if (data && data.hasOwnProperty) {
        // define the key if a non-empty string was provided
        if (data.hasOwnProperty('key')) {
            let customKey = parseString(data.key);
            if (customKey) {
                attributes.key = customKey;
            }
        }

        // define the state as either enabled or disabled
        if (data.hasOwnProperty('state')) {
            let isEnabled = true;
            if (typeof data.state === 'boolean') {
                isEnabled = data.state;
            } else if (typeof data.state === 'string') {
                isEnabled = !(data.state === 'disabled');
            }
            attributes.state = isEnabled ? 'enabled' : 'disabled';
        }

        // define the name if a non-empty string was provided
        if (data.hasOwnProperty('name')) {
            let customName = parseString(data.name);
            if (customName) {
                attributes.name = customName;
            }
        }
    }

    return attributes;
}

module.exports = {
    parseWebResourceAttributes,
};
