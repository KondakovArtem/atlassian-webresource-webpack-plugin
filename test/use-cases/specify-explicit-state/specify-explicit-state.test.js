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

    it('should create a webresource with an explicit key and state when state was not provided in config', () => {
        const node = wrNodes.filter(n => n.attributes.key === 'app-key');
        assert.equal(node.length, 1);
        assert.equal(node[0].attributes.key, 'app-key');
        assert.equal(node[0].attributes.state, 'enabled');
    });

    it('should create a webresource with an explicit key and state when it is mapped in config', () => {
        let nodeWithNameAttr = wrNodes.filter(node => node.attributes.key === 'app-key-with-state');
        assert.equal(nodeWithNameAttr.length, 1);
        assert.equal(nodeWithNameAttr[0].attributes.key, 'app-key-with-state');
        assert.equal(nodeWithNameAttr[0].attributes.state, 'disabled');
    });
});
