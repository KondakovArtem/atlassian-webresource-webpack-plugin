const path = require('path');
const webpack = require('webpack');
const WrmPlugin = require('../../../src/index');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    entry: {
        'app': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app2': path.join(FRONTEND_SRC_DIR, 'app.2.js')
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            verbose: false,
            __testGlobs__: ["**/src/*_test.js"],
        }),
        new webpack.optimize.CommonsChunkPlugin({
            name: 'runtime',
            minChunks: Infinity,
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR
    }
};
