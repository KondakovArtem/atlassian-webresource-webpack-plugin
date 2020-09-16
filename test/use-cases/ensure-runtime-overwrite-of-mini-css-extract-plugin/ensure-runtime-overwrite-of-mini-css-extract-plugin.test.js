const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('ensure-runtime-overwrite-of-mini-css-extract-plugin', () => {
    describe('mini-css-extract-plugin is defined before wrm-plugin', () => {
        const config = require('./webpack.before.config.js');

        beforeEach(done => {
            webpack(config, () => {
                done();
            });
        });

        it('should inject a WRM pre-condition checker into the webpack runtime', () => {
            // setup
            const bundleFile = fs.readFileSync(path.join(targetDir, 'app-before.js'), 'utf-8');
            const expectedRuntimeAdjustment = require('../../fixtures/webpack-runtime-chunks').asyncChunkLoader(
                'com.atlassian.plugin.test'
            );

            assert.include(bundleFile, expectedRuntimeAdjustment, 'expect runtime overwrite');
        });
    });

    describe('mini-css-extract-plugin is defined after wrm-plugin', () => {
        const config = require('./webpack.after.config.js');

        beforeEach(done => {
            webpack(config, () => {
                done();
            });
        });

        it('should inject a WRM pre-condition checker into the webpack runtime', () => {
            // setup
            const bundleFile = fs.readFileSync(path.join(targetDir, 'app-after.js'), 'utf-8');
            const expectedRuntimeAdjustment = require('../../fixtures/webpack-runtime-chunks').asyncChunkLoader(
                'com.atlassian.plugin.test'
            );

            assert.include(bundleFile, expectedRuntimeAdjustment, 'expect runtime overwrite');
        });
    });
});
