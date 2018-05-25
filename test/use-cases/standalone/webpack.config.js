const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.resolve(__dirname, 'src');
const OUTPUT_DIR = path.resolve(__dirname, 'target');

module.exports = {
    mode: 'development',
    context: FRONTEND_SRC_DIR,
    entry: {
        'standalone-1': path.join(FRONTEND_SRC_DIR, 'standalone-1.js'),
        'standalone-2': path.join(FRONTEND_SRC_DIR, 'standalone-2.js'),
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(__dirname, 'target', 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            verbose: false,
            standalone: true,
        }),
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(OUTPUT_DIR),
    },
};
