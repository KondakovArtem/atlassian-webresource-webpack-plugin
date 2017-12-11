let verbose = false;

exports.log = (...args) => {
    verbose && console.log(...args);
}

exports.warn = (...args) => {
    verbose && console.warn(...args);
}

exports.error = (...args) => {
    verbose && console.error(...args);
}

exports.setVerbose = arg => verbose = arg;