const { renderElement, stringifyAttributes } = require('./WRMHelpers');

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
