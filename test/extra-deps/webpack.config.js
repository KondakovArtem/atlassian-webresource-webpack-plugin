const path = require('path');
const WrmPlugin = require('../../src/index');
const FRONTEND_SRC_DIR = path.resolve(__dirname, 'src');
const OUTPUT_DIR = path.resolve(__dirname, 'target');

module.exports = {
    context: FRONTEND_SRC_DIR,
    entry: {
        'atl.general': path.join(FRONTEND_SRC_DIR, 'app.js')
    },
    externals: {
        'aui/flag': 'AJS.flag',
        'wrm/require': 'WRM.require'
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            contextMap: { 'atl.general': [''] },
            xmlDescriptors: path.join(__dirname, 'target', 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            verbose: false,
        }),
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(OUTPUT_DIR)
    }
};
