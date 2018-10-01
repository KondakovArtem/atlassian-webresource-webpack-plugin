const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.resolve(__dirname, 'src');
const OUTPUT_DIR = path.resolve(__dirname, 'target');

module.exports = {
    mode: 'development',
    context: FRONTEND_SRC_DIR,
    entry: {
        'simple-entry': path.join(FRONTEND_SRC_DIR, 'simple.js'),
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            contextMap: { 'simple-entry': [''] },
            xmlDescriptors: path.join(__dirname, 'target', 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            locationPrefix: 'js',
            verbose: false,
        }),
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(OUTPUT_DIR),
    },
};
