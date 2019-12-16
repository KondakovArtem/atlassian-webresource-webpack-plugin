const _ = require('lodash');
const CROSS_PLATFORM_BASE_CONTEXTS = [];

function process(arr) {
    return _.chain([].concat(CROSS_PLATFORM_BASE_CONTEXTS, arr))
        .filter(val => !!val)
        .uniq()
        .value();
}

function BaseContexts() {
    let configuredContexts = [];

    return {
        getBaseContexts() {
            // defensively cloning so consumers can't accidentally add anything
            return [...configuredContexts];
        },

        setBaseContexts(val) {
            const contexts = [];
            if (val instanceof Array) {
                contexts.push(...val);
            } else if (typeof val === 'string') {
                contexts.push(val);
            }

            configuredContexts = process(contexts);
        },

        addBaseContext(val) {
            configuredContexts = process([...configuredContexts, val]);
        },
    };
}

module.exports = new BaseContexts();
