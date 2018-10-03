const WRMHelpers = require('./WRMHelpers');

function renderTransformer(transformers) {
    return transformers
        .map(transformer => WRMHelpers.renderElement(
                'transformer',
                WRMHelpers.stringifyAttributes({ key: transformer })
            ))
        .join('');
}

module.exports = function renderTransformation(transformations) {
    return Object.keys(transformations)
        .map(fileExtension =>
            WRMHelpers.renderElement(
                'transformation',
                WRMHelpers.stringifyAttributes({ extension: fileExtension }),
                renderTransformer(transformations[fileExtension])
            )
        )
        .join('');
};
