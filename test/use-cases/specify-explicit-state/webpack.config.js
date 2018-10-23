const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    mode: 'development',
    entry: {
        'app-good-mapped-with-string': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-good-mapped-without-state': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-good-mapped-with-state': path.join(FRONTEND_SRC_DIR, 'app.js'),
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            webresourceKeyMap: {
                'app-good-mapped-without-state': {
                    key: 'app-key'
                },
                'app-good-mapped-with-state': {
                    key: 'app-key-with-state',
                    state: 'disabled'
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
