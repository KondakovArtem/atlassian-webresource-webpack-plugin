/**
 * @param {Object} attributes
 * @returns {string}
 */
function stringifyAttributes(attributes) {
    if (!attributes) {
        return '';
    }

    return (
        ' ' +
        Object.keys(attributes)
            .map(key => {
                const val = typeof attributes[key] === 'undefined' ? '' : String(attributes[key]);
                return `${key}="${val}"`;
            })
            .join(' ')
    );
}

function renderElement(name, attributes, children) {
    if (typeof attributes === 'object') {
        attributes = stringifyAttributes(attributes);
    }
    // avoid outputting 'undefined' when attributes aren't present.
    if (!attributes) {
        attributes = '';
    }
    // convert children array in to a string.
    // assume they are string values already. (todo: refactor for nested rendering?)
    if (Array.isArray(children)) {
        children = children.join('\n');
    }
    // render self-closing tags based on whether there is no child input.
    if (!children) {
        return `<${name}${attributes}/>`;
    }
    return `<${name}${attributes}>${children}</${name}>`;
}

module.exports = {
    renderElement,
    stringifyAttributes,
};
