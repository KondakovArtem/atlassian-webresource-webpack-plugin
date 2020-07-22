const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

const { dataProviders } = require('./webpack.config');

const dataProvidersMap = new Map();

for (const [entryPointKey, providers] of Object.entries(dataProviders)) {
    dataProvidersMap.set(entryPointKey, providers);
}

module.exports = {
    mode: 'development',
    entry: {
        'my-first-entry-point': path.join(FRONTEND_SRC_DIR, 'first.js'),
        'my-second-entry-point': path.join(FRONTEND_SRC_DIR, 'second.js'),
        'my-third-entry-point': path.join(FRONTEND_SRC_DIR, 'third.js'),
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            verbose: false,
            dataProvidersMap,
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR,
    },
};
