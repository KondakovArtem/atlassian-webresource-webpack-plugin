const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    mode: 'development',
    entry: {
        'app-good-newcontexts': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-good-implicit': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-bad-emptyarray': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-bad-emptyvalues': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-bad-objectlike': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-bad-falsy': path.join(FRONTEND_SRC_DIR, 'app.js'),
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            addEntrypointNameAsContext: false,
            contextMap: {
                'app-good-newcontexts': ['some:weird:context', 'foo.bar'],
                'app-bad-emptyarray': [],
                'app-bad-emptyvalues': [false, '', undefined, 'foo.bar'],
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
