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
 * @typedef {Object} WebResourceAttributes
 * @property {wrKey} key - the unique identifier for this web-resource.
 * @property {string} [name] - the human-readable name of the web-resource.
 * @property {true|false} [state] - whether this web-resource should output its resources at runtime or not.
 *   If absent, a web-resource is assumed to be enabled.
 */

/**
 * @typedef {Object} WrmEntrypoint
 * @description wraps a set of related resources with metadata the WRM can understand and reason about as a discrete unit.
 * @property {WebResourceAttributes} attributes - the metadata for this web-resource.
 * @property {filepath[]} resources - the locations of all resources directly referenced by this entrypoint's graph.
 * @property {Resource[]} externalResources - a filename and filepath pair for resources
 *   discovered by the WRM plugin's loaders.
 * @property {wrDep[]} [dependencies] - a list of other web-resources this one should depend upon.
 * @property {string[]} [contexts] - a list of contexts the web-resource should be loaded in to.
 * @property {object[]} [conditions] - a list of conditions to apply to the web-resource to determine whether
 *   it should output its resources at runtime or not.
 */

/**
 * @typedef {Object} DataProvider
 * @description Data provider shape used by `dataProvidersMap` option.
 * @property {String} key - Data provider key e.g. `my-data-provider`
 * @property {String} class - Data provider Java class e.g. `my.data.provider.JavaClass`
 */
