const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    mode: 'development',
    entry: {
        'app-good-mapped-with-string': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-good-mapped-with-object': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-good-mapped-with-object-with-name': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-good-autonamed': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-bad-objectlike': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-bad-falsy': path.join(FRONTEND_SRC_DIR, 'app.js'),
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            webresourceKeyMap: {
                'app-good-mapped-with-string': 'legacy-name-for-app',
                'app-good-mapped-with-object': {
                    key: 'app-key',
                },
                'app-good-mapped-with-object-with-name': {
                    key: 'app-key-with-name',
                    name: 'Legacy Name for App',
                },
                'app-bad-objectlike': {},
                'app-bad-falsy': '',
            },
            verbose: false,
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR,
    },
};
