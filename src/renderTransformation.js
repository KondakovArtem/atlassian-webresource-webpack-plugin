const path = require('path');
const { renderElement, stringifyAttributes } = require('./WRMHelpers');

function renderTransformer(transformers) {
    return transformers
        .map(transformer => renderElement('transformer', stringifyAttributes({ key: transformer })))
        .join('');
}

/**
 * Generates the appropriate function to be used when filtering a transform map down to only those required.
 * @param {Resource[]} resources
 * @returns {function}
 */
function transformFilterFactory(resources) {
    if (resources && resources.length) {
        const resourceFiletypes = resources.map(resource => path.extname(resource.location).substr(1));
        return ext => resourceFiletypes.includes(ext);
    }
    return () => true;
}

/**
 * Converts a map of filetype-to-transformer entries in to the set of XML transform elements
 * required for a given set of resources. Renders every transform if no resources are provided.
 * @param transformations
 * @param {Resource[]} resources
 * @returns {string} the rendered XML for each necessary transform.
 */
module.exports = function renderTransformation(transformations, resources = []) {
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
