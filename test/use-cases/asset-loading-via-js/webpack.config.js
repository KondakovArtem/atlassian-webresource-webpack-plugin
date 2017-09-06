const path = require('path');
const WrmPlugin = require('../../../src/index');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    entry: {
        'app': path.join(FRONTEND_SRC_DIR, 'app.js')
    },
    module: {
        rules: [
            {
                test: /\.(png|svg)$/,
                loader: "file-loader",
            },
        ],
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
