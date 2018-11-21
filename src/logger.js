/* eslint-disable no-console */
let verbose = false;
const setVerbose = arg => (verbose = arg);

function log(...args) {
    if (verbose) {
        console.log(...args);
    }
}

function warn(...args) {
    if (verbose) {
        console.warn(...args);
    }
}

function error(...args) {
    if (verbose) {
        console.error(...args);
    }
}

module.exports = {
    log,
    warn,
    error,
    setVerbose,
};
