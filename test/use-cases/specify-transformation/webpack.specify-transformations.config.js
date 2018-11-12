const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    mode: 'development',
    entry: {
        'app-one': path.join(FRONTEND_SRC_DIR, 'app.js'),
    },
    module: {
        rules: [
            {
                test: /\.(?!js)/,
                use: 'file-loader',
            },
        ],
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            transformationMap: {
                js: ['foo', 'bar'],
                html: ['stuff', 'n stuff'],
                txt: ['bar', 'bar'],
            },
            verbose: false,
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR,
    },
};
