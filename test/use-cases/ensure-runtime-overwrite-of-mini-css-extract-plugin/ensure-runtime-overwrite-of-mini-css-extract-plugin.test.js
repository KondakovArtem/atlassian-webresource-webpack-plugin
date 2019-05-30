const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('ensure-runtime-overwrite-of-mini-css-extract-plugin', function() {
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

            const expectedRuntimeAdjustment = `
/******/ 		var promises = [];
/******/
/******/ 		if(installedChunks[chunkId] === 0) { // 0 means "already installed".
/******/ 		    return Promise.resolve();
/******/ 		}
/******/
/******/ 		if (installedChunks[chunkId]) {
/******/ 		    return installedChunks[chunkId][2];
/******/ 		}
/******/
/******/ 		promises.push(
/******/ 		    new Promise(function(resolve, reject) {
/******/ 		        installedChunks[chunkId] = [resolve, reject];
/******/ 		    }),
/******/ 		    new Promise(function(resolve, reject) {
/******/ 		        WRM.require('wrc!com.atlassian.plugin.test:' + chunkId).then(resolve, reject);
/******/ 		    })
/******/ 		);
/******/ 		return installedChunks[chunkId][2] = Promise.all(promises);`;

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

            const expectedRuntimeAdjustment = `
/******/ 		var promises = [];
/******/
/******/ 		if(installedChunks[chunkId] === 0) { // 0 means "already installed".
/******/ 		    return Promise.resolve();
/******/ 		}
/******/
/******/ 		if (installedChunks[chunkId]) {
/******/ 		    return installedChunks[chunkId][2];
/******/ 		}
/******/
/******/ 		promises.push(
/******/ 		    new Promise(function(resolve, reject) {
/******/ 		        installedChunks[chunkId] = [resolve, reject];
/******/ 		    }),
/******/ 		    new Promise(function(resolve, reject) {
/******/ 		        WRM.require('wrc!com.atlassian.plugin.test:' + chunkId).then(resolve, reject);
/******/ 		    })
/******/ 		);
/******/ 		return installedChunks[chunkId][2] = Promise.all(promises);`;

            assert.include(bundleFile, expectedRuntimeAdjustment, 'expect runtime overwrite');
        });
    });
});
