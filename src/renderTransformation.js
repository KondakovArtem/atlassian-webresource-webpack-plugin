const path = require('path');
const { renderElement, stringifyAttributes } = require('./WRMHelpers');

function renderTransformer(transformers) {
    return transformers
        .map(transformer => renderElement('transformer', stringifyAttributes({ key: transformer })))
        .join('');
}

function transformFilterFactory(resources) {
    if (resources) {
        const resourceFiletypes = resources.map(resource => path.extname(resource).substr(1));
        return ext => resourceFiletypes.includes(ext);
    }
    return () => true;
}

module.exports = function renderTransformation(transformations, resources = false) {
    return Object.keys(transformations)
        .filter(transformFilterFactory(resources))
        .map(fileExtension =>
            renderElement(
                'transformation',
                stringifyAttributes({ extension: fileExtension }),
                renderTransformer(transformations[fileExtension])
            )
        )
        .join('');
};
