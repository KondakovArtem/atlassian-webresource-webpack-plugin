const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    mode: 'development',
    entry: {
        app: path.join(FRONTEND_SRC_DIR, 'app.js'),
    },
    module: {
        rules: [
            {
                test: /\.(png|svg|jpg)$/,
                loader: 'file-loader',
            },
        ],
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            verbose: false,
            resourceParamMap: {
                svg: [
                    {
                        name: 'content-type',
                        value: 'image/svg+xml',
                    },
                    {
                        name: 'foo',
                        value: 'bar',
                    },
                ],
                png: [
                    {
                        name: 'bar',
                        value: 'baz',
                    },
                ],
                jpg: [
                    {
                        name: 'duped',
                        value: 'first',
                    },
                    {
                        name: 'bar',
                        value: 'baz',
                    },
                    {
                        name: 'duped',
                        value: 'second',
                    },
                ],
            },
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR,
    },
};
