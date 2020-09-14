/**
 * @fileOverview
 * Collects a set of web-resource dependencies that should be added
 * to all the web-resources generated during compilation.
 */
const uniq = require('lodash/uniq');
const CROSS_PLATFORM_BASE_DEPS = [];

function process(arr) {
    return uniq([...CROSS_PLATFORM_BASE_DEPS, ...arr].filter(Boolean));
}

let configuredContexts = [];

function getBaseDependencies() {
    // defensively cloning so consumers can't accidentally add anything
    return [...configuredContexts];
}

function setBaseDependencies(val) {
    const contexts = [];
    if (val instanceof Array) {
        contexts.push(...val);
    } else if (typeof val === 'string') {
        contexts.push(val);
    }

    configuredContexts = process(contexts);
}

function addBaseDependency(val) {
    configuredContexts = process([...configuredContexts, val]);
}

module.exports = {
    addBaseDependency,
    getBaseDependencies,
    setBaseDependencies,
};
