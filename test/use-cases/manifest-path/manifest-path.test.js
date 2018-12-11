const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const manifestOutput = path.join(targetDir, 'manifest.json');

describe('manifest-path', function() {
    let config = require('./webpack.config.js');

    it('generates a manifest JSON file', done => {
        webpack(config, (err, stats) => {
            if (err) {
                throw err;
            }
            assert.equal(stats.hasErrors(), false);
            assert.equal(stats.hasWarnings(), false);
            assert.equal(fs.existsSync(manifestOutput), true);
            done();
        });
    });

    it('contains all entrypoints', done => {
        webpack(config, err => {
            if (err) {
                throw err;
            }

            const manifest = require(manifestOutput);
            const entries = Object.getOwnPropertyNames(manifest);
            assert.equal(entries.length, 2);

            assert.equal(manifest.app.dependency, 'com.atlassian.plugin.test:entrypoint-app');
            assert.equal(manifest.app.import.var, `require('app')`);
            assert.equal(manifest.app.import.amd, 'app');

            assert.equal(manifest.app2.dependency, 'com.atlassian.plugin.test:app2-custom-entrypoint-name');
            assert.equal(manifest.app2.import.var, `require('app2')`);
            assert.equal(manifest.app2.import.amd, 'app2');

            done();
        });
    });
});
