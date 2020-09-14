const path = require('path');
const { renderElement } = require('./xml');
const { parseWebResourceAttributes } = require('./web-resource-parser');
const renderCondition = require('./renderCondition');
const renderTransforms = require('./renderTransformations');

/**
 * Renders list of data providers {@see DataProvider} as <data key="provider-key" class="data.provider.Class" /> elements
 *
 * @param {DataProvider[]} dataProviders
 * @return {string[]}
 */
const renderDataProviders = dataProviders => {
    if (!Array.isArray(dataProviders) || !dataProviders.length < 0) {
        return [];
    }

    return dataProviders.map(dataProvider =>
        renderElement('data', {
            key: dataProvider.key,
            class: dataProvider.class,
        })
    );
};

function renderContexts(contexts) {
    return contexts ? contexts.map(context => `<context>${context}</context>`) : [];
}

function renderDependencies(dependencies) {
    return dependencies ? dependencies.map(dependency => `<dependency>${dependency}</dependency>`) : [];
}

/**
 * @param {Resource} resource
 * @param {Map<String, Array<Object>>} parameterMap
 * @returns {string} an XML representation of a {@link Resource}.
 */
function generateResourceElement(resource, parameterMap) {
    const { name, location } = resource;
    const assetContentType = path.extname(location).substr(1);
    const parameters = parameterMap.get(assetContentType) || [];
    const children = [];
    const renderParameters = attributes => children.push(renderElement('param', attributes));
    parameters.forEach(renderParameters);

    return renderElement(
        'resource',
        {
            type: 'download',
            name,
            location,
        },
        children
    );
}

/**
 * @param {Map<String, Array<Object>>} parameterMap
 * @param {Resource[]} resources
 * @returns {string[]} XML strings of all {@link Resource} elements
 */
function renderResources(parameterMap, resources) {
    return resources ? resources.filter(Boolean).map(resource => generateResourceElement(resource, parameterMap)) : [];
}

/**
 * @param {WrmEntrypoint} webresource
 * @param {Map<String, Array<String>>} transformations
 * @param {String} pathPrefix
 * @param {Map<String, Array<Object>>} parameterMap
 * @param standalone
 * @returns {string} an XML representation of the {@link WrmEntrypoint}.
 */
function renderWebResource(webresource, transformations, pathPrefix = '', parameterMap = new Map(), standalone) {
    const { resources = [], externalResources = [], contexts, dependencies, conditions, dataProviders } = webresource;
    const attributes = parseWebResourceAttributes(webresource.attributes);
    const allResources = [];
    const children = [];

    /** convert filepaths in to {@link Resource}s. */
    const convertFilePaths = location => pathPrefix + location;

    // add resources for direct dependencies (e.g., JS and CSS files)
    allResources.push(...resources.map(res => ({ name: res, location: convertFilePaths(res) })));

    if (standalone) {
        children.push(...renderResources(parameterMap, allResources));
    } else {
        // add resources for indirect dependencies (e.g., images extracted from CSS)
        allResources.push(...externalResources.map(wr => ({ name: wr.name, location: convertFilePaths(wr.location) })));

        children.push(
            ...renderTransforms(transformations, allResources),
            ...renderContexts(contexts),
            ...renderDependencies(dependencies),
            ...renderResources(parameterMap, allResources),
            ...renderDataProviders(dataProviders),
            renderCondition(conditions)
        );
    }

    return renderElement('web-resource', attributes, children);
}

module.exports = {
    renderWebResource,
};
