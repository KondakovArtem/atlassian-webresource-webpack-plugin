const assert = require('assert');
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('specify-explicit-context', function () {
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let entry;
    let contexts;

    function getContexts(node) {
        return node.children.filter(node => node.name === "context")
    }

    function getContent(nodes) {
        return nodes.map(node => node.content);
    }

    beforeEach((done) => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entry = results.root.children.find(node => node.attributes.key.startsWith("entry"));
            contexts = getContent(getContexts(entry));
            done();
        });
    });

    it('should create a webresource', () => {
        assert.ok(entry);
        assert.ok(contexts);
        assert.equal(3, contexts.length)
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    it('add additional contexts as specified in the contextMap', () => {
        assert.ok(contexts.includes('some:weird:context'));
        assert.ok(contexts.includes('foo:bar'));
        assert.ok(contexts.includes('app'));
    });
});
