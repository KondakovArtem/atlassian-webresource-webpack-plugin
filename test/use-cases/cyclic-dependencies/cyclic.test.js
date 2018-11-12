const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('cyclic', function() {
    let config = require('./webpack.config.js');

    it('compiles an xml file', done => {
        webpack(config, (err, stats) => {
            if (err) {
                throw err;
            }
            assert.equal(stats.hasErrors(), false);
            assert.equal(stats.hasWarnings(), false);
            assert.equal(fs.existsSync(webresourceOutput), true);
            done();
        });
    });
});
