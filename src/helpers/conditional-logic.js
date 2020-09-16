const { version } = require('webpack');
const majorVersion = parseInt(version.replace(/\..*$/, ''));
const isWebpack5 = majorVersion > 4;

function webpack5or4(inV5, inV4) {
    return isWebpack5 ? inV5 && inV5() : inV4 && inV4();
}

module.exports = {
    webpack5or4,
};
