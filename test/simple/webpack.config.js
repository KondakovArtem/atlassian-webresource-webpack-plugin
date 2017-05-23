const path = require("path");
const WrmPlugin = require("../../src/index");
const FRONTEND_SRC_DIR = path.resolve(__dirname, 'src');
const OUTPUT_DIR = path.resolve(__dirname, 'target');

module.exports = {
    context: FRONTEND_SRC_DIR,
    entry: {
        'simple-entry': path.join(FRONTEND_SRC_DIR, 'simple.js')
    },
    plugins: [
        new WrmPlugin(),
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(OUTPUT_DIR)
    }
};
