/** 
 * If there is a module of code that lives outside of the product's or plugin's source code, 
 * you will need to register the module name, along with the WRM dependency that provides it.
 * 
 * The external section is for AMD modules outside of your source code, 
 * and internal are ones within your source code.
 * 
 */
module.exports = {
    external: {
        // Global dependencies. Every web-resource key added here is assumed
        // to be a necessary prerequisite for all code to run, so will be
        // added as <dependency> blocks to every web-resource generated.
        "*": [],
        // Add a specific dependency as follows:
        // "module/name": ["plugin.group.and.artifact:webresource-key", "plugin.group.and.artifact:another-webresource"]
        "wrm/require": ["com.atlassian.plugins.atlassian-plugins-webresource-rest:web-resource-manager"],
        "wrm/data": ["com.atlassian.plugins.atlassian-plugins-webresource-plugin:data"]
    },
    internal: {
        // Global dependencies. Every web-resource key added here is assumed
        // to be a necessary prerequisite for all code to run, so will be
        // added as <dependency> blocks to every web-resource generated.
        "*": []
        // Add a specific dependency as follows:
        // "module/name": ["plugin.group.and.artifact:webresource-key", "plugin.group.and.artifact:another-webresource"]
    }
};
