const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('specify-explicit-webresource-name', function () {
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let wrNodes;

    beforeEach((done) => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            wrNodes = results.root.children.filter(node => node.name === 'web-resource');
            done();
        });
    });

    it('should work without error', () => {
        assert.notEqual(wrNodes.length, 0);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    it('should create a webresource with an explicit name', () => {
        let typical = wrNodes.find(node => node.attributes.key.startsWith('entry'));
        assert.equal(typical, null, 'no web-resource should exist with a key starting with "entry", because they should all have been explicitly named via config.');

        let expected = wrNodes.find(node => node.attributes.key === 'legacy-name-for-app');
        assert.notEqual(expected, null, 'a web-resource should exist with the name "legacy-name-for-app" based on our webpack config.');
    });
});
