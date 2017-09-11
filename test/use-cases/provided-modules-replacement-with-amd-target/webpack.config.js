const path = require('path');
const webpack = require('webpack');

const WrmPlugin = require('../../../src/index');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

const providedDependencies = new Map();
providedDependencies.set('jquery', {
    dependency: "jira.webresources:jquery",
    import: {
        var: "require('jquery')",
        amd: "jquery",
    },
});
providedDependencies.set('underscore', {
    dependency: "com.atlassian.plugin.jslibs:underscore-1.4.4",
    import: {
        var: "require('underscore')",
        amd: "underscore",
    },
});

module.exports = {
    entry: {
        'app': path.join(FRONTEND_SRC_DIR, 'app.js')
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            name: 'runtime',
            minChunks: Infinity,
        }),
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            verbose: false,
            providedDependencies
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR,
        libraryTarget: 'amd'
    }
};