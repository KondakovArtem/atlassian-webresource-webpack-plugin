const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

const dataProviders = {
    'my-first-entry-point': [
        {
            key: 'first-data-provider',
            class: 'data.provider.JavaClass',
        },

        // Invalid shape
        [],
    ],

    'my-second-entry-point': [
        {
            key: 'foo-data-provider',
            class: 'data.provider.FooClass',
        },

        {
            key: 'bar-data-provider',
            class: 'data.provider.BarClass',
        },

        // Missing class
        {
            key: 'provider-with-missing-class',
        },

        // Missing key
        {
            class: 'provider-with-missing-key',
        },
    ],

    // Missing entry point
    'invalid-entry-point': [
        {
            key: 'foo',
            class: 'DataProvider',
        },
    ],

    // Invalid value of data provider lists
    'my-third-entry-point': true,
};

module.exports = () => ({
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
            dataProvidersMap: dataProviders,
        }),
    ],

    output: {
        filename: '[name].js',
        path: OUTPUT_DIR,
    },
});

module.exports.dataProviders = dataProviders;
