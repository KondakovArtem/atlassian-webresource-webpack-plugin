function stringifyAttributes(attributes) {
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

function renderElement(name, attributes, children) {
    if (typeof attributes === 'object') {
        attributes = stringifyAttributes(attributes);
    }
    if (!attributes) {
        attributes = '';
    }
    if (!children) {
        return `<${name}${attributes}/>`;
    }
    return `<${name}${attributes}>${children}</${name}>`;
}

module.exports = {
    renderElement,
    stringifyAttributes,
};
