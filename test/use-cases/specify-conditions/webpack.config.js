const path = require('path');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'target');

module.exports = {
    mode: 'development',
    entry: {
        'app-one': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-two': path.join(FRONTEND_SRC_DIR, 'app.js'),
        'app-three': path.join(FRONTEND_SRC_DIR, 'app.js'),
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'com.atlassian.plugin.test',
            xmlDescriptors: path.join(OUTPUT_DIR, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml'),
            conditionMap: {
                'app-one': {
                    type: 'AND',
                    conditions: [
                        {
                            type: 'OR',
                            conditions: [
                                {
                                    class: 'foo.bar.baz',
                                    invert: true,
                                    params: [{ attributes: { name: 'permission' }, value: 'admin' }],
                                },
                                {
                                    class: 'foo.bar.baz2',
                                    params: [{ attributes: { name: 'permission' }, value: 'project' }],
                                },
                            ],
                        },
                        {
                            class: 'foo.bar.baz3',
                            params: [{ attributes: { name: 'permission' }, value: 'admin' }],
                        },
                    ],
                },
                'app-two': {
                    class: 'foo.bar.baz',
                    invert: true,
                    params: [{ attributes: { name: 'permission' }, value: 'admin' }],
                },
                'app-three': [
                    {
                        class: 'foo.bar.baz',
                        invert: true,
                        params: [{ attributes: { name: 'permission' }, value: 'admin' }],
                    },
                    {
                        class: 'foo.bar.baz2',
                        params: [{ attributes: { name: 'permission' }, value: 'project' }],
                    },
                ],
            },
            verbose: false,
        }),
    ],
    output: {
        filename: '[name].js',
        path: OUTPUT_DIR,
    },
};
