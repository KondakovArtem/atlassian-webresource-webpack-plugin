const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    mode: 'development',
    entry: {
        app: path.join(FRONTEND_SRC_DIR, 'app.js'),
        app2: path.join(FRONTEND_SRC_DIR, 'app.2.js'),
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            verbose: false,
            __testGlobs__: ['**/qunit-test-wrm-web-resource/src/*_test.js'],
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR,
    },
};
