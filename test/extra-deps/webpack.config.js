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
            // Always add these dependencies to our generated web-resources.
            wrmDependencies: [
                'com.atlassian.plugins.jquery:jquery',
                'com.atlassian.auiplugin:ajs-core'
            ],
            options: {
                dependenciesFile: path.resolve(__dirname, 'webresource-deps.config.js')
            }
        }),
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(OUTPUT_DIR)
    }
};
