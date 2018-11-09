const path = require('path');
const renderCondition = require('./renderCondition');
const renderTransformation = require('./renderTransformation');

class XMLFormatter {
    static context(contexts) {
        return contexts.map(context => `<context>${context}</context>`).join('');
    }

    static dependencies(dependencies) {
        return dependencies.map(dependency => `<dependency>${dependency}</dependency>`).join('\n');
    }

    static generateResourceElement(name, location, contentType) {
        const assetContentTyp = path.extname(location).substr(1);
        const contentTypeForAsset = contentType[assetContentTyp];
        if (!contentTypeForAsset) {
            return `<resource name="${name}" type="download" location="${location}" />`;
        }

        return `<resource name="${name}" type="download" location="${location}"><param name="content-type" value="${contentTypeForAsset}"/></resource>`;
    }

    static externalResources(resourcesPairs, contentTypes) {
        return resourcesPairs
            .map(resourcePair => XMLFormatter.generateResourceElement(resourcePair[0], resourcePair[1], contentTypes))
            .join('\n');
    }

    static resources(pathPrefix, contentTypes, resources) {
        return resources
            .map(resource => XMLFormatter.generateResourceElement(resource, pathPrefix + resource, contentTypes))
            .join('\n');
    }
}

function createWebResource(webresource, transformations, pathPrefix = '', contentTypes = {}, standalone) {
    const { resources, externalResources, contexts, dependencies, conditions } = webresource;
    const resourceArgs = webresource.attributes;
    const name = resourceArgs.name || '';
    if (standalone) {
        return `
            <web-resource key="${resourceArgs.key}" name="${name}">
                ${resources ? XMLFormatter.resources(pathPrefix, contentTypes, resources) : ''}
            </web-resource>
        `;
    }
    return `
        <web-resource key="${resourceArgs.key}" name="${name}">
            ${renderTransformation(transformations, resources)}
            ${contexts ? XMLFormatter.context(contexts) : ''}
            ${dependencies ? XMLFormatter.dependencies(dependencies) : ''}
            ${externalResources ? XMLFormatter.externalResources(externalResources, contentTypes) : ''}
            ${resources ? XMLFormatter.resources(pathPrefix, contentTypes, resources) : ''}
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
