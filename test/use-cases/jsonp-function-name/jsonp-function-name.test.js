const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const appOutput = path.join(targetDir, 'app.js');

describe('jsonp-function-name-default', function () {
    const config = require('./webpack.config.js');

    let appCode;
    let error;
    let stats;

    before((done) => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            appCode = fs.readFileSync(appOutput, 'utf-8');
            done();
        });
    });

    it('should create a webresources without errors', () => {
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    it('should not overwrite the webpack jsonp function if specified in the options and not the default name', () => {
        assert.include(appCode, 'var parentJsonpFunction = window["someGivenName"];', "expect the webpack jsonp global function to be renamed");
    });
});
