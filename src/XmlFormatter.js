const path = require('path');
const renderCondition = require('./renderCondition');

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

function createWebResource(resource, pathPrefix = '', contentTypes = {}) {
    return `
        <web-resource key="${resource.key}">
            <transformation extension="js">
                <transformer key="jsI18n"/>
            </transformation>
             <transformation extension="soy">
                <transformer key="soyTransformer"/>
                <transformer key="jsI18n" />
            </transformation>
            <transformation extension="less">
                <transformer key="lessTransformer"/>
            </transformation>
            ${resource.contexts ? XMLFormatter.context(resource.contexts) : ''}
            ${resource.dependencies ? XMLFormatter.dependencies(resource.dependencies) : ''}
            ${
                resource.externalResources
                    ? XMLFormatter.externalResources(resource.externalResources, contentTypes)
                    : ''
            }
            ${resource.resources ? XMLFormatter.resources(pathPrefix, contentTypes, resource.resources) : ''}
            ${resource.conditions ? renderCondition(resource.conditions) : ''}
        </web-resource>
    `;
}

const createQUnitResources = filename => `<resource type="qunit" name="${filename}" location="${filename}" />`;

exports.createResourceDescriptors = function(jsonDescriptors, pathPrefix, contentTypes) {
    const descriptors = jsonDescriptors.map(descriptor => {
        // TODO: Introduce pluggability for web-resource conditions here.
        // e.g., Allow for ServiceDesk to inject their licensed condition, or for a devmode hotreload server condition.
        if (!descriptor.isDevModeOnly) {
            return createWebResource(descriptor, pathPrefix, contentTypes);
        }
    });

    return descriptors.join('');
};

exports.createTestResourceDescriptors = function(jsonTestDescriptors) {
    const testDescriptors = jsonTestDescriptors.map(descriptor => createWebResource(descriptor));
    return testDescriptors.join('');
};

exports.createQUnitResourceDescriptors = function(qUnitTestFiles) {
    return qUnitTestFiles.map(createQUnitResources).join('');
};
