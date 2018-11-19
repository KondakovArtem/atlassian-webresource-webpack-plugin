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
