const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('specify-explicit-webresource-name', function() {
    const config = require('./webpack.config.js');

    let stats;
    let wrNodes;

    beforeEach(done => {
        webpack(config, (err, st) => {
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

    it('should create a webresource with an explicit name when it is mapped in config', () => {
        let expected = wrNodes.find(node => node.attributes.key === 'legacy-name-for-app');
        assert.notEqual(
            expected,
            null,
            'a web-resource should exist with the name "legacy-name-for-app" based on our webpack config.'
        );
    });

    it('should create a webresource with an explicit key and name when it is mapped in config', () => {
       let node = wrNodes.filter(node => node.attributes.key === 'app-key');
       assert.equal(node.length, 1);
       assert.equal(node[0].attributes.key, 'app-key');
       assert.equal(node[0].attributes.name, '');
    });

    it('should create a webresource with an explicit key and name when it is mapped in config', () => {
        let nodeWithNameAttr = wrNodes.filter(node => node.attributes.key === 'app-key-with-name');
        assert.equal(nodeWithNameAttr.length, 1);
        assert.equal(nodeWithNameAttr[0].attributes.key, 'app-key-with-name');
        assert.equal(nodeWithNameAttr[0].attributes.name, 'Legacy Name for App');
     });

    it('should auto-generate the name if there is no config provided', () => {
        let goodNodes = wrNodes.filter(node => node.attributes.key.startsWith('entrypoint-app-good'));
        assert.equal(goodNodes.length, 1);
        assert.equal(
            goodNodes[0].attributes.key,
            'entrypoint-app-good-autonamed',
            'there was no mapping for this web-resource, so the key is auto-generated'
        );
    });

    it('should auto-generate the name when the supplied value is not a string', () => {
        let badNodes = wrNodes.filter(node => node.attributes.key.startsWith('entrypoint-app-bad'));
        assert.equal(badNodes.length, 2);
        assert.equal(
            badNodes[0].attributes.key,
            'entrypoint-app-bad-objectlike',
            'an object is not a string, so the key is auto-generated'
        );
        assert.equal(
            badNodes[1].attributes.key,
            'entrypoint-app-bad-falsy',
            'falsy values are not strings, so the key is auto-generated'
        );
    });
});
