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

    function findWrEndingWith(key) {
        return wrNodes.find(n => n.attributes.key.endsWith(key));
    }

    beforeEach(done => {
        webpack(config, (err, st) => {
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            wrNodes = results.root.children.filter(n => n.name === 'web-resource');
            done();
        });
    });

    it('should work without error', () => {
        assert.notEqual(wrNodes.length, 0);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    it('should create a webresource with an explicit name when it is mapped in config', () => {
        let node = findWrEndingWith('mapped-with-string');
        assert.exists(node);
        assert.propertyVal(node.attributes, 'key', 'customkey-mapped-with-string');
    });

    it('should create a webresource with an explicit key when it is mapped in config', () => {
        let node = findWrEndingWith('mapped-with-object');
        assert.exists(node);
        assert.propertyVal(node.attributes, 'key', 'customkey-mapped-with-object');
    });

    it('should create a webresource with an explicit name when it is mapped in config', () => {
        let node = findWrEndingWith('mapped-with-object-with-only-name');
        assert.exists(node);
        assert.property(
            node.attributes,
            'key',
            'entrypoint-app-good-mapped-with-object-with-only-name',
            'no "key" was provided so should be auto-generated'
        );
        assert.propertyVal(
            node.attributes,
            'name',
            'Legacy Name for App 2',
            'should use the configured value for "name"'
        );
    });

    it('should create a webresource with an explicit key and name when it is mapped in config', () => {
        let node = findWrEndingWith('mapped-with-object-with-name');
        assert.exists(node);
        assert.propertyVal(
            node.attributes,
            'key',
            'customkey-mapped-with-object-with-name',
            'should use the configured value for "key"'
        );
        assert.propertyVal(
            node.attributes,
            'name',
            'Legacy Name for App 1',
            'should use the configured value for "name"'
        );
    });

    it('should auto-generate the name if there is no config provided', () => {
        let node = findWrEndingWith('app-good-autonamed');
        assert.exists(node);
        assert.propertyVal(
            node.attributes,
            'key',
            'entrypoint-app-good-autonamed',
            'there was no mapping for this web-resource, so the key is auto-generated'
        );
    });

    it('should auto-generate the name when the supplied value is not a string', () => {
        let badNodes = wrNodes.filter(n => n.attributes.key.startsWith('entrypoint-app-bad'));
        assert.equal(badNodes.length, 2);
        assert.propertyVal(
            badNodes[0].attributes,
            'key',
            'entrypoint-app-bad-objectlike',
            'an object is not a string, so the key is auto-generated'
        );
        assert.propertyVal(
            badNodes[1].attributes,
            'key',
            'entrypoint-app-bad-falsy',
            'falsy values are not strings, so the key is auto-generated'
        );
    });
});
