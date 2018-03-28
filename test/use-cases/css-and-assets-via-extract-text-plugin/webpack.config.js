const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    mode: 'production',
    entry: {
        'feature-one': path.join(FRONTEND_SRC_DIR, 'feature-one.js'),
        'feature-two': path.join(FRONTEND_SRC_DIR, 'feature-two.js'),
    },
    module: {
        rules: [
            {
                test: /\.(css)$/,
                loader: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                        },
                    },
                }),
            },
            {
                test: /\.(png|svg)$/,
                loader: 'file-loader',
            },
        ],
    },
    plugins: [
        new ExtractTextPlugin('[name].css'),
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            verbose: false,
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR,
    },
};
