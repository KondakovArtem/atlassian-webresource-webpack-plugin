/**
 * @fileOverview
 * Collects a set of web-resource dependencies that should be added
 * to all the web-resources generated during compilation.
 */
const _ = require('lodash');
const CROSS_PLATFORM_BASE_DEPS = [];

function process(arr) {
    return _.chain([].concat(CROSS_PLATFORM_BASE_DEPS, arr))
        .filter(val => !!val)
        .uniq()
        .value();
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
