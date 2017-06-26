const unlicensedContexts = require("../config/unlicensed-contexts");

function clientResourceTemplate(b) {
    const TEMPLATES = {
        context(context) {
            return `<context>${context}</context>`;
        },
        dependencies(dependencies) {
            return dependencies
                .map((dependency) => `<dependency>${dependency}</dependency>`)
                .join("\n");
        },
        resources(resources) {
            return resources
                .map((resource) => `<resource name="${resource}" type="download" location="${resource}" />`)
                .join("\n");
        },
        condition(conditions) {
            const conditionsStr = conditions.map((descriptor) => {
                return `<condition class="${descriptor.condition}" invert="${descriptor.invert || false}" />`;
            }).join("\n");

            if (conditions.length > 1) {
                return `
                <conditions type="AND">
                    ${conditionsStr}
                </conditions>`;
            }
            return conditionsStr;
        }
    };

    function getXml(template, arg1, arg2) {
        return arg1 ? template(arg1, arg2) : "";
    }

    return `
        <web-resource key="${b.key}">
            <transformation extension="js">
                <transformer key="jsI18n"/>
            </transformation>
            ${getXml(TEMPLATES.context, b.context)}
            ${getXml(TEMPLATES.dependencies, b.dependencies)}
            ${getXml(TEMPLATES.resources, b.resources)}
            ${getXml(TEMPLATES.condition, b.conditions)}
        </web-resource>
    `;
}

module.exports = {

    createResourceDescriptor(jsonDescriptor) {
        // TODO: Introduce pluggability for web-resource conditions here.
        // e.g., Allow for ServiceDesk to inject their licensed condition, or for a devmode hotreload server condition.
        if (!jsonDescriptor.isDevModeOnly) {
            return clientResourceTemplate(jsonDescriptor);
        }
    },
    createResourceDescriptors(jsonDescriptors) {
            const descriptors = jsonDescriptors.map((descriptor) => {
                return this.createResourceDescriptor(descriptor);
            });

            const descriptorsStr = descriptors.join("\n\n");
            return `<bundles>\n${descriptorsStr}\n</bundles>`
    }
};
