const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const wrmManifestOutput = path.join(targetDir, 'manifest.json');

describe('wrm-manifest-path', function() {
    let config = require('./webpack.config.js');

    it('generates a manifest JSON file', done => {
        webpack(config, (err, stats) => {
            if (err) {
                throw err;
            }
            assert.equal(stats.hasErrors(), false);
            assert.equal(stats.hasWarnings(), false);
            assert.equal(fs.existsSync(wrmManifestOutput), true);
            done();
        });
    });

    it('contains all entrypoints', done => {
        webpack(config, err => {
            if (err) {
                throw err;
            }

            const wrmManifest = require(wrmManifestOutput).providedDependencies;
            const entries = Object.getOwnPropertyNames(wrmManifest);
            assert.equal(entries.length, 2);
            assert.equal(wrmManifest.app.dependency, 'com.atlassian.plugin.test:entrypoint-app');
            assert.equal(wrmManifest.app2.dependency, 'com.atlassian.plugin.test:app2-custom-entrypoint-name');

            done();
        });
    });

    it('handles custom library [name]s', done => {
        webpack(config, err => {
            if (err) {
                throw err;
            }

            const wrmManifest = require(wrmManifestOutput).providedDependencies;
            assert.equal(wrmManifest.app.import.var, `require('app-with-a-custom-library-name')`);
            assert.equal(wrmManifest.app.import.amd, 'app-with-a-custom-library-name');

            assert.equal(wrmManifest.app2.import.var, `require('app2-with-a-custom-library-name')`);
            assert.equal(wrmManifest.app2.import.amd, 'app2-with-a-custom-library-name');

            done();
        });
    });
});
