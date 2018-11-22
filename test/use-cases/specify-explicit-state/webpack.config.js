const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    mode: 'development',
    entry: {
        'plain-string': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'only-key': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'only-state': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'only-state-boolean-enabled': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'only-state-boolean-disabled': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'key-state-enabled': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'key-state-disabled': path.join(FRONTEND_SRC_DIR, 'app.js'),
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            webresourceKeyMap: {
                'plain-string': 'customkey-plain-string',
                'only-key': {
                    key: 'customkey-only-key',
                },
                'only-state': {
                    state: 'disabled',
                },
                'only-state-boolean-enabled': {
                    state: true,
                },
                'only-state-boolean-disabled': {
                    state: false,
                },
                'key-state-enabled': {
                    key: 'customkey-key-state-enabled',
                    state: 'enabled',
                },
                'key-state-disabled': {
                    key: 'customkey-key-state-disabled',
                    state: 'disabled',
                },
            },
            verbose: false,
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR,
    },
};
