const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.resolve(__dirname, 'src');
const OUTPUT_DIR = path.resolve(__dirname, 'target');

module.exports = (runtimeChunk, webresourceOutput, singleRuntimeWebResourceKey) => ({
    mode: 'development',
    context: FRONTEND_SRC_DIR,
    entry: {
        first: path.join(FRONTEND_SRC_DIR, 'first.js'),
        second: path.join(FRONTEND_SRC_DIR, 'second.js'),
        third: path.join(FRONTEND_SRC_DIR, 'third.js'),
    },
    optimization: {
        runtimeChunk,
        splitChunks: {
            minSize: 0,
            chunks: 'all',
        },
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: webresourceOutput,
            verbose: false,
            singleRuntimeWebResourceKey,
        }),
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(OUTPUT_DIR),
    },
});
