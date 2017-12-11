/* eslint-disable no-console */
let verbose = false;

exports.log = (...args) => {
    if (verbose) {
        console.log(...args);
    }
};

exports.warn = (...args) => {
    if (verbose) {
        console.warn(...args);
    }
};

exports.error = (...args) => {
    if (verbose) {
        console.error(...args);
    }
};

exports.setVerbose = arg => (verbose = arg);
