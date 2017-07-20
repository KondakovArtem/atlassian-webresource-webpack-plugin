const path = require('path');
const WrmPlugin = require('../../src/index');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src-amd');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    entry: {
        'app-amd': path.join(FRONTEND_SRC_DIR, 'app.js')
    },
    plugins: [
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
