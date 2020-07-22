const path = require('path');
const { renderElement } = require('./xml');
const { parseWebResourceAttributes } = require('./web-resource-parser');
const renderCondition = require('../renderCondition');
const renderTransformation = require('../renderTransformation');

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

function generateContext(contexts) {
    return contexts ? contexts.map(context => `<context>${context}</context>`).join('') : '';
}

function generateDependencies(dependencies) {
    return dependencies ? dependencies.map(dependency => `<dependency>${dependency}</dependency>`).join('\n') : '';
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
 * Generates a <resource> descriptor that will glue the source code for a file to the qunit test runner.
 * @param {filepath} filepath
 * @returns {string} an XML representation of a {@link Resource}.
 */
function generateQunitResourceElement(filepath) {
    return renderElement('resource', { type: 'qunit', name: filepath, location: filepath });
}

/**
 * @param {Map<String, Array<Object>>} parameterMap
 * @param {Resource[]} resources
 * @returns {string} an XML string of all {@link Resource} elements
 */
function generateResources(parameterMap, resources) {
    return resources
        .filter(r => !!r)
        .map(resource => generateResourceElement(resource, parameterMap))
        .join('\n');
}

/**
 * @param {WrmEntrypoint} webresource
 * @param {Map<String, Array<String>>} transformations
 * @param {String} pathPrefix
 * @param {Map<String, Array<Object>>} parameterMap
 * @param standalone
 * @returns {string} an XML representation of the {@link WrmEntrypoint}.
 */
function createWebResource(webresource, transformations, pathPrefix = '', parameterMap = new Map(), standalone) {
    const { resources = [], externalResources = [], contexts, dependencies, conditions, dataProviders } = webresource;
    const attributes = parseWebResourceAttributes(webresource.attributes);
    const allResources = [];
    const children = [];

    /** convert filepaths in to {@link Resource}s. */
    const convertFilePaths = location => pathPrefix + location;

    // add resources for direct dependencies (e.g., JS and CSS files)
    allResources.push(...resources.map(res => ({ name: res, location: convertFilePaths(res) })));

    if (standalone) {
        children.push(generateResources(parameterMap, allResources));
    } else {
        // add resources for indirect dependencies (e.g., images extracted from CSS)
        allResources.push(...externalResources.map(wr => ({ name: wr.name, location: convertFilePaths(wr.location) })));

        children.push(
            renderTransformation(transformations, allResources),
            generateContext(contexts),
            generateDependencies(dependencies),
            generateResources(parameterMap, allResources),
            renderCondition(conditions),
            ...renderDataProviders(dataProviders)
        );
    }

    return renderElement('web-resource', attributes, children);
}

function createResourceDescriptors(jsonDescriptors, transformations, pathPrefix, parameterMap, standalone) {
    const descriptors = jsonDescriptors.map(descriptor =>
        createWebResource(descriptor, transformations, pathPrefix, parameterMap, standalone)
    );
    return descriptors.join('');
}

function createTestResourceDescriptors(jsonTestDescriptors, transformations) {
    const testDescriptors = jsonTestDescriptors.map(descriptor => createWebResource(descriptor, transformations));
    return testDescriptors.join('');
}

function createQUnitResourceDescriptors(qUnitTestFiles) {
    return qUnitTestFiles.map(generateQunitResourceElement).join('');
}

module.exports = {
    createResourceDescriptors,
    createTestResourceDescriptors,
    createQUnitResourceDescriptors,
};
