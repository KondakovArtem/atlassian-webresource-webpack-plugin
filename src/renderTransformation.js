const path = require('path');
const { renderElement } = require('./helpers/xml');
const { toMap } = require('./helpers/options-parser');

function renderTransformer(transformers) {
    if (transformers && transformers.length) {
        return transformers.map(transformer => renderElement('transformer', { key: transformer })).join('');
    }
    return '';
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
 * @param {Map<String, Array<String>>} transformations
 * @param {Resource[]} resources
 * @returns {string} the rendered XML for each necessary transform.
 */
module.exports = function renderTransformation(transformations, resources = []) {
    const transMap = toMap(transformations);
    return Array.from(transMap.keys())
        .filter(transformFilterFactory(resources))
        .map(fileExtension =>
            renderElement(
                'transformation',
                { extension: fileExtension },
                renderTransformer(transMap.get(fileExtension))
            )
        )
        .join('');
};
