const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    mode: 'development',
    entry: {
        app: path.join(FRONTEND_SRC_DIR, 'app.js'),
        app2: path.join(FRONTEND_SRC_DIR, 'app2.js'),
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            verbose: false,
            wrmManifestPath: path.join(OUTPUT_DIR, 'manifest.json'),
            webresourceKeyMap: { app2: 'app2-custom-entrypoint-name' },
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR,
        library: '[name]-with-a-custom-library-name',
        libraryTarget: 'amd',
    },
};
