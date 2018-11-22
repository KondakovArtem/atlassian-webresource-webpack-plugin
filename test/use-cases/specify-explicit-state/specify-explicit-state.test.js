const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('specify-explicit-webresource-state', function() {
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
            wrNodes = results.root.children.filter(node => node.name === 'web-resource');
            done();
        });
    });

    it('should work without error', () => {
        assert.notEqual(wrNodes.length, 0);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    describe('providing a plain string', () => {
        it('should create a webresource with an implicit state', () => {
            const node = findWrEndingWith('plain-string');
            assert.exists(node);
            assert.notProperty(
                node.attributes,
                'state',
                'WRM assumes missing state means enabled, so attribute is unneeded'
            );
        });
    });

    describe('providing only a key', () => {
        it('should create a webresource with an implicit state', () => {
            const node = findWrEndingWith('only-key');
            assert.exists(node);
            assert.notProperty(
                node.attributes,
                'state',
                'WRM assumes missing state means enabled, so attribute is unneeded'
            );
        });
    });

    describe('providing only a state', () => {
        it('should create a webresource with an explicit state', () => {
            const node = findWrEndingWith('only-state');
            assert.exists(node);
            assert.propertyVal(node.attributes, 'state', 'disabled');
        });

        it('should interpret a boolean of "true" as enabled', () => {
            const node = findWrEndingWith('only-state-boolean-enabled');
            assert.exists(node);
            assert.propertyVal(node.attributes, 'state', 'enabled');
        });

        it('should interpret a boolean of "false" as disabled', () => {
            const node = findWrEndingWith('only-state-boolean-disabled');
            assert.exists(node);
            assert.propertyVal(node.attributes, 'state', 'disabled');
        });
    });

    describe('providing an explicit key and state', () => {
        it('should create a webresource with explicit values when the state is "enabled"', () => {
            const node = findWrEndingWith('key-state-enabled');
            assert.exists(node);
            assert.propertyVal(node.attributes, 'key', 'customkey-key-state-enabled');
            assert.propertyVal(node.attributes, 'state', 'enabled');
        });

        it('should create a webresource with explicit values when the state is "disabled"', () => {
            const node = findWrEndingWith('key-state-disabled');
            assert.exists(node);
            assert.propertyVal(node.attributes, 'key', 'customkey-key-state-disabled');
            assert.propertyVal(node.attributes, 'state', 'disabled');
        });
    });
});
