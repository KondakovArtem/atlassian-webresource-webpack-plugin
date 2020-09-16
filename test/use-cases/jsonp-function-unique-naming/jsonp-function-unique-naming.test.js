const assert = require('chai').assert;
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');
const { webpack5or4 } = require('../../../src/helpers/conditional-logic.js');

const targetDir = path.join(__dirname, 'target');
const appOutput = path.join(targetDir, 'app.js');

const jsonpFragmentv4 = /jsonpArray = window\["(.*?)\"] = window\["(.*?)\"] \|\| \[\];/;
const jsonpFragmentv5 = /chunkLoadingGlobal = self\["(.*?)\"] = self\["(.*?)\"] \|\| \[\];/;

describe('jsonp-function-naming', function () {
    let appCode;
    let error;
    /** @type {webpack.Stats} */
    let stats;

    const run = config => {
        return new Promise((resolve, reject) => {
            webpack(config, (err, st) => {
                error = err;
                stats = st;

                appCode = fs.readFileSync(appOutput, 'utf-8');
                resolve();
            });
        });
    };

    function v4tests() {
        describe('webpack 4 defaults', () => {
            before(async () => {
                const config = require('./webpack.config.js');
                // we want to see webpack 4's behaviour when this is not set.
                delete config.output.jsonpFunction;
                await run(config);
            });

            it('should create a webresources without errors', () => {
                assert.equal(stats.hasErrors(), false);
                assert.equal(stats.hasWarnings(), false);
            });

            it('should rename the webpack jsonp function to a unique name for the plugin', () => {
                const matches = jsonpFragmentv4.exec(appCode);

                assert.ok(matches, 'webpack output a jsonp section');
                assert.equal(matches[2], matches[1], 'webpack did its job properly');

                const jsonpFnName = matches[1];
                assert.notEqual(jsonpFnName, 'webpackJsonp', 'should not be a generic name');

                // our code should rename the function
                assert.startsWith(
                    jsonpFnName,
                    'atlassianWebpackJsonp',
                    'expect the webpack jsonp global function to be renamed'
                );
                assert.ok(jsonpFnName.match(/[0-9a-f]{32}$/), 'jsonp function name ends with a SHA');
            });
        });

        describe('webpack 4 configured', () => {
            before(async () => {
                const config = require('./webpack.config.js');
                config.output.jsonpFunction = 'someFooBar';
                await run(config);
            });

            it('affects the chunk name', () => {
                const matches = jsonpFragmentv4.exec(appCode);
                assert.equal(matches[1], 'someFooBar', 'expect the webpack jsonp global function to be renamed');
            });
        });
    }

    function v5tests() {
        describe('webpack 5 defaults', () => {
            before(async () => {
                const config = require('./webpack.config.js');
                // remove invalid config options in webpack 5
                delete config.output.jsonpFunction;
                // we want to see webpack 5's behaviour when this is not set.
                delete config.output.uniqueName;
                await run(config);
            });

            it('should create a webresources without errors', () => {
                assert.equal(stats.hasErrors(), false);
                assert.equal(stats.hasWarnings(), false);
            });

            it('should output a jsonp fragment', () => {
                const matches = jsonpFragmentv5.exec(appCode);
                assert.ok(matches, 'webpack output a jsonp section');

                const jsonpFnName = matches[1];

                // we cannot affect the name in webpack5.
                // config is parsed and jsonpFunction is always non-null before the environment hooks run.
                assert.equal(
                    jsonpFnName,
                    'webpackChunkatlassian_webresource_webpack_plugin',
                    'webpack names the jsonp function based on the package.json name'
                );
            });
        });

        describe('webpack 5 configured', () => {
            before(async () => {
                const config = require('./webpack.config.js');
                config.output.uniqueName = 'someFooBar';
                await run(config);
            });

            it('affects the chunk name', () => {
                const matches = jsonpFragmentv5.exec(appCode);
                assert.equal(
                    matches[1],
                    'webpackChunksomeFooBar',
                    'expect the webpack jsonp global function to be renamed'
                );
            });
        });
    }

    webpack5or4(v5tests, v4tests);
});
