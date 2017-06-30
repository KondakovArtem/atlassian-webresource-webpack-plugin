const PrettyData = require('pretty-data').pd;

class XMLFormatter {
    static context(context) {
        return `<context>${context}</context>`;
    }

    static dependencies(dependencies) {
        return dependencies
            .map((dependency) => `<dependency>${dependency}</dependency>`)
            .join("\n");
    }

    static resources(resources) {
        return resources
            .map((resource) => `<resource name="${resource}" type="download" location="dist/${resource}" />`)
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

function createWebResource(resource) {
    return `
        <web-resource key="${resource.key}">
            <transformation extension="js">
                <transformer key="jsI18n"/>
            </transformation>
            ${resource.context ? XMLFormatter.context(resource.context): ""}
            ${resource.dependencies ? XMLFormatter.dependencies(resource.dependencies): ""}
            ${resource.resources ? XMLFormatter.resources(resource.resources): ""}
            ${resource.conditions ? XMLFormatter.condition(resource.conditions): ""}
        </web-resource>
    `;
}

exports.createResourceDescriptors = function (jsonDescriptors) {
    const descriptors = jsonDescriptors.map((descriptor) => {
        // TODO: Introduce pluggability for web-resource conditions here.
        // e.g., Allow for ServiceDesk to inject their licensed condition, or for a devmode hotreload server condition.
        if (!descriptor.isDevModeOnly) {
            return createWebResource(descriptor);
        }
    });

    const descriptorsStr = descriptors.join("\n\n");
    return PrettyData.xml(`<bundles>\n${descriptorsStr}\n</bundles>`);
};
