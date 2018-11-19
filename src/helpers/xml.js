class Helpers {
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
}

module.exports = {
    renderElement: Helpers.renderElement,
    stringifyAttributes: Helpers.stringifyAttributes,
};
