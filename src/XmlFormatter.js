const path = require('path');
const renderCondition = require('./renderCondition');
const renderTransformation = require('./renderTransformation');

/**
 * @typedef {String} filepath - a relative filepath in unix format.
 */

/**
 * @typedef {String} filename
 */

/**
 * @typedef {String} wrKey
 */

/**
 * @typedef {String} wrDep - a composite string in the format "maven.groupId.artifactId:webresource-key"
 */

/**
 * @typedef {Object} Resource
 * @property {filepath} location - the relative path for the resource,
 *   starting from the root of the plugin's classpath (the JAR file).
 * @property {filename} name - the asset's filename as it appears in the browser at runtime.
 */

/**
 * @typedef {Object} WrmEntrypoint
 * @property {wrKey} key - the unique identifier for this set of resources.
 * @property {true|false} state - whether this web-resource should output its resources at runtime or not.
 * @property {filepath[]} resources - the locations of all resources directly referenced by this entrypoint's graph.
 * @property {{0:filename,1:filepath}[]} externalResources - a filename and filepath pair for resources
 *   discovered by the WRM plugin's loaders.
 * @property {wrDep[]} [dependencies] - a list of other web-resources this one should depend upon.
 * @property {string[]} [contexts] - a list of contexts the web-resource should be loaded in to.
 * @property {object[]} [conditions] - a list of conditions to apply to the web-resource to determine whether
 *   it should output its resources at runtime or not.
 */

/**
 * Utilities for outputting the various XML fragments needed
 * in an Atlassian plugin.
 */
class XMLFormatter {
    static context(contexts) {
        return contexts.map(context => `<context>${context}</context>`).join('');
    }

    static dependencies(dependencies) {
        return dependencies.map(dependency => `<dependency>${dependency}</dependency>`).join('\n');
    }

    /**
     * @param {Resource} resource
     * @param {[]} contentTypes
     * @returns {string} an XML representation of a {@link Resource}.
     */
    static generateResourceElement(resource, contentTypes) {
        const { name, location } = resource;
        const assetContentTyp = path.extname(location).substr(1);
        const contentTypeForAsset = contentTypes[assetContentTyp];
        if (!contentTypeForAsset) {
            return `<resource name="${name}" type="download" location="${location}" />`;
        }

        return `<resource name="${name}" type="download" location="${location}"><param name="content-type" value="${contentTypeForAsset}"/></resource>`;
    }

    /**
     * @param {[]} contentTypes
     * @param {Resource[]} resources
     * @returns {string} an XML string of all {@link Resource} elements
     */
    static resources(contentTypes, resources) {
        return resources.map(resource => XMLFormatter.generateResourceElement(resource, contentTypes)).join('\n');
    }
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
    const resourceArgs = webresource.attributes;
    const name = resourceArgs.name || '';
    const state = resourceArgs.state || 'enabled';

    let allResources = []
        .concat(
            resources.map(r => {
                return { name: r, location: pathPrefix + r };
            })
        )
        .filter(r => !!r);

    if (standalone) {
        return `
            <web-resource key="${resourceArgs.key}" name="${name}" state="${state}">
                ${allResources.length ? XMLFormatter.resources(contentTypes, allResources) : ''}
            </web-resource>
        `;
    }

    allResources = allResources
        .concat(
            externalResources.map(rp => {
                return { name: rp[0], location: rp[1] };
            })
        )
        .filter(r => !!r);

    return `
        <web-resource key="${resourceArgs.key}" name="${name}" state="${state}">
            ${renderTransformation(transformations, allResources)}
            ${contexts ? XMLFormatter.context(contexts) : ''}
            ${dependencies ? XMLFormatter.dependencies(dependencies) : ''}
            ${allResources.length ? XMLFormatter.resources(contentTypes, allResources) : ''}
            ${conditions ? renderCondition(conditions) : ''}
        </web-resource>
    `;
}

const createQUnitResources = filename => `<resource type="qunit" name="${filename}" location="${filename}" />`;

exports.createResourceDescriptors = function(jsonDescriptors, transformations, pathPrefix, contentTypes, standalone) {
    const descriptors = jsonDescriptors.map(descriptor =>
        createWebResource(descriptor, transformations, pathPrefix, contentTypes, standalone)
    );
    return descriptors.join('');
};

exports.createTestResourceDescriptors = function(jsonTestDescriptors, transformations) {
    const testDescriptors = jsonTestDescriptors.map(descriptor => createWebResource(descriptor, transformations));
    return testDescriptors.join('');
};

exports.createQUnitResourceDescriptors = function(qUnitTestFiles) {
    return qUnitTestFiles.map(createQUnitResources).join('');
};
