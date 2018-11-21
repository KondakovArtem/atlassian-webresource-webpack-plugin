const path = require('path');
const { renderElement } = require('./xml');
const renderCondition = require('../renderCondition');
const renderTransformation = require('../renderTransformation');

function generateContext(contexts) {
    return contexts ? contexts.map(context => `<context>${context}</context>`).join('') : '';
}

function generateDependencies(dependencies) {
    return dependencies ? dependencies.map(dependency => `<dependency>${dependency}</dependency>`).join('\n') : '';
}

/**
 * @param {Resource} resource
 * @param {[]} contentTypes
 * @returns {string} an XML representation of a {@link Resource}.
 */
function generateResourceElement(resource, contentTypes) {
    const { name, location } = resource;
    const assetContentTyp = path.extname(location).substr(1);
    const contentTypeForAsset = contentTypes[assetContentTyp];
    const children = [];
    if (contentTypeForAsset) {
        children.push(renderElement('param', { name: 'content-type', value: contentTypeForAsset }));
    }

    return renderElement(
        'resource',
        {
            name,
            type: 'download',
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
 * @param {[]} contentTypes
 * @param {Resource[]} resources
 * @returns {string} an XML string of all {@link Resource} elements
 */
function generateResources(contentTypes, resources) {
    return resources
        .filter(r => !!r)
        .map(resource => generateResourceElement(resource, contentTypes))
        .join('\n');
}

/**
 * @param {WrmEntrypoint} webresource
 * @param transformations
 * @param pathPrefix
 * @param contentTypes
 * @param standalone
 * @returns {string} an XML representation of the {@link WrmEntrypoint}.
 */
function createWebResource(webresource, transformations, pathPrefix = '', contentTypes = {}, standalone) {
    const { resources = [], externalResources = [], contexts, dependencies, conditions } = webresource;
    const attributes = webresource.attributes;
    attributes.name = attributes.name || '';
    attributes.state = attributes.state || 'enabled';
    const allResources = [];
    const children = [];

    // add resources for direct dependencies (e.g., JS and CSS files)
    allResources.push(
        ...resources.map(r => {
            /** convert filepaths in to {@link Resource}s. */
            return { name: r, location: pathPrefix + r };
        })
    );

    if (standalone) {
        children.push(generateResources(contentTypes, allResources));
    } else {
        // add resources for indirect dependencies (e.g., images extracted from CSS)
        allResources.push(...externalResources);
        children.push(
            renderTransformation(transformations, allResources),
            generateContext(contexts),
            generateDependencies(dependencies),
            generateResources(contentTypes, allResources),
            renderCondition(conditions)
        );
    }

    return renderElement('web-resource', attributes, children);
}

function createResourceDescriptors(jsonDescriptors, transformations, pathPrefix, contentTypes, standalone) {
    const descriptors = jsonDescriptors.map(descriptor =>
        createWebResource(descriptor, transformations, pathPrefix, contentTypes, standalone)
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
