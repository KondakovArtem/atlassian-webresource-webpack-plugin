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
    if (!children) {
        return `<${name}${attributes}/>`;
    }
    return `<${name}${attributes}>${children}</${name}>`;
}

function renderTransformer(transformers) {
    return transformers
        .map(transformer => renderElement('transformer', stringifyAttributes({ key: transformer })))
        .join('');
}

module.exports = function renderTransformation(transformations) {
    return Object.keys(transformations)
        .map(fileExtension =>
            renderElement(
                'transformation',
                stringifyAttributes({ extension: fileExtension }),
                renderTransformer(transformations[fileExtension])
            )
        )
        .join('');
};
