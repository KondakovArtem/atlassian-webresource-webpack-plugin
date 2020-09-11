let isWebpack5 = undefined;

function webpack5or4(inV5, inV4) {
    if (typeof isWebpack5 === 'undefined') {
        const { version } = require('webpack');
        const majorVersion = parseInt(version.replace(/\..*$/, ''));
        isWebpack5 = majorVersion > 4;
    }
    return isWebpack5 ? inV5 && inV5() : inV4 && inV4();
}

module.exports = {
    webpack5or4,
};
