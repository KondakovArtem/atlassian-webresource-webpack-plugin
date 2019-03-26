const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('split-chunks-with-key-sanitation', function() {
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let entryApp;
    let entryApp2;
    let splitChunkShared;

    function getChild(node, name) {
        return node.children.filter(n => n.name === name);
    }

    function getContent(nodes) {
        return nodes.map(n => n.content);
    }

    before(done => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entryApp = results.root.children.find(n => n.attributes.key === 'entrypoint-some-path-in-entry-name');
            entryApp2 = results.root.children.find(n => n.attributes.key === 'entrypoint-another-path');
            splitChunkShared = results.root.children.find(
                n => n.attributes.key === 'split_another-path~some-path-in-entry-name'
            );
            done();
        });
    });

    it('should create webresources with their keys sanitized (no slashes)', () => {
        assert.ok(entryApp);
        assert.ok(entryApp2);
        assert.ok(splitChunkShared);

        assert.equal(error, null);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    it('entry points should have dependency to split chunks using sanitized key', () => {
        const depsApp = getContent(getChild(entryApp, 'dependency'));
        const depsApp2 = getContent(getChild(entryApp2, 'dependency'));

        assert.include(
            depsApp,
            'com.atlassian.plugin.test:split_another-path~some-path-in-entry-name',
            'expected dependency not found'
        );
        assert.include(
            depsApp2,
            'com.atlassian.plugin.test:split_another-path~some-path-in-entry-name',
            'expected dependency not found'
        );
    });
});
