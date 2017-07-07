const path = require('path');
const webpack = require('webpack');

const WrmPlugin = require('../../src/index');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    entry: {
        'app': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'foo': path.join(FRONTEND_SRC_DIR, 'foo.js')
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            name: 'commons',
            minChunks: 2
        }),
         new webpack.optimize.CommonsChunkPlugin({
            name: 'runtime',
            minChunks: Infinity,
        }),
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            verbose: false,
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR
    }
};
