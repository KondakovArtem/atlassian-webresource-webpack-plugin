const path = require('path');
const PrettyData = require('pretty-data').pd;

class XMLFormatter {
    static context(contexts) {
        return contexts.map(context => `<context>${context}</context>`).join('');
    }

    static dependencies(dependencies) {
        return dependencies
            .map((dependency) => `<dependency>${dependency}</dependency>`)
            .join("\n");
    }

    static externalResources(resourcesPairs) {
        return resourcesPairs
            .map((resourcePair) => `<resource name="${resourcePair[0]}" type="download" location="${resourcePair[1]}" />`)
            .join("\n");
    }

    static resources(pathPrefix, resources) {
        return resources
            .map((resource) => `<resource name="${resource}" type="download" location="${pathPrefix}${resource}" />`)
            .join("\n");
    }

    static condition(conditions) {
        const conditionsStr = conditions.map((condition) => {
            return `<condition class="${condition.condition}" invert="${condition.invert || false}" />`;
        }).join("\n");

        if (conditions.length > 1) {
            return `
            <conditions type="AND">
                ${conditionsStr}
            </conditions>`;
        }
        return conditionsStr;
    }
}

function createWebResource(pathPrefix, resource) {
    return `
        <web-resource key="${resource.key}">
            <transformation extension="js">
                <transformer key="jsI18n"/>
            </transformation>
             <transformation extension="soy">
                <transformer key="soyTransformer"/>
            </transformation>
            <transformation extension="less">
                <transformer key="lessTransformer"/>
            </transformation>
            ${resource.contexts ? XMLFormatter.context(resource.contexts): ""}
            ${resource.dependencies ? XMLFormatter.dependencies(resource.dependencies): ""}
            ${resource.externalResources ? XMLFormatter.externalResources(resource.externalResources): ""}
            ${resource.resources ? XMLFormatter.resources(pathPrefix, resource.resources): ""}
            ${resource.conditions ? XMLFormatter.condition(resource.conditions): ""}
        </web-resource>
    `;
}

exports.createResourceDescriptors = function (pathPrefix, jsonDescriptors) {
    const descriptors = jsonDescriptors.map((descriptor) => {
        // TODO: Introduce pluggability for web-resource conditions here.
        // e.g., Allow for ServiceDesk to inject their licensed condition, or for a devmode hotreload server condition.
        if (!descriptor.isDevModeOnly) {
            return createWebResource(pathPrefix, descriptor);
        }
    });

    const descriptorsStr = descriptors.join("\n\n");
    return PrettyData.xml(`<bundles>\n${descriptorsStr}\n</bundles>`);
};
