const _ = require("lodash");
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

        jsonDescriptor.conditions = [];
        
        // by default we do not allow our web resources to bind to contexts when we are 
        // unlicensed as this can add service desk resources to instances where it isn't
        // even being used. There are some special cases where you may want to. These are
        // declared in unlicensed-contexts.js
        if (!_.includes(unlicensedContexts, jsonDescriptor.context)) {
            jsonDescriptor.conditions.push({
                condition: "com.atlassian.servicedesk.internal.conditions.urlreading.UrlReadingSDOperationalCondition"
            });
        }
        if (jsonDescriptor.isDevModeOnly) {
            jsonDescriptor.conditions.push({
                condition: "com.atlassian.servicedesk.internal.conditions.WebpackDevModeUrlReadingCondition"
            });
        } else if (jsonDescriptor.isProdModeOnly) {
            jsonDescriptor.conditions.push({
                condition: "com.atlassian.servicedesk.internal.conditions.WebpackDevModeUrlReadingCondition",
                invert: true
            });
        }

        return clientResourceTemplate(jsonDescriptor);
    },
    createResourceDescriptors(jsonDescriptors) {
            const descriptors = jsonDescriptors.map((descriptor) => {
                return this.createResourceDescriptor(descriptor);
            });
            const descriptorsStr = _.values(descriptors).join("\n\n");
            return `<bundles>\n${descriptorsStr}\n</bundles>`
    }
};
