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

    static resources(contentTypes, resources) {
        return resources
            .map(({ name, location }) => XMLFormatter.generateResourceElement(name, location, contentTypes))
            .join('\n');
    }
}

function createWebResource(webresource, transformations, pathPrefix = '', contentTypes = {}, standalone) {
    const { resources = [], externalResources = [], contexts, dependencies, conditions } = webresource;
    const resourceArgs = webresource.attributes;
    const name = resourceArgs.name || '';

    let allResources = []
        .concat(
            resources.map(r => {
                return { name: r, location: pathPrefix + r };
            })
        )
        .filter(r => !!r);

    if (standalone) {
        return `
            <web-resource key="${resourceArgs.key}" name="${name}">
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
        <web-resource key="${resourceArgs.key}" name="${name}">
            ${renderTransformation(transformations, allResources.map(r => r.location))}
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
