const assert = require('assert');
const parse = require('xml-parser');
const webpack = require('webpack');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, 'extra-deps');
const webresourceOutput = path.join(base, 'target', 'META-INF', 'plugin-descriptors', 'wr-webpack-bundles.xml');

describe('extra-deps', function() {
    let config = require(path.join(base, 'webpack.config.js'));

    it('outputs declared web-resource dependencies', (done) => {
        webpack(config, (err, stats) => {
            let xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            let results = parse(xmlFile);
            let contextDepsNode = _.find(results.root.children, (node) => {
                return node.attributes.key === 'context-deps-atl.general'
            });
            let generatedDepsNodes = _.filter(contextDepsNode.children, (node) => {
                return node.name === 'dependency';
            });
            assert.equal(stats.hasErrors(), false);
            assert.equal(stats.hasWarnings(), false);
            assert.equal(generatedDepsNodes.length, 2);
            assert.equal(generatedDepsNodes[0].content, 'com.atlassian.plugins.jquery:jquery');
            assert.equal(generatedDepsNodes[1].content, 'com.atlassian.auiplugin:ajs-core');
            done();
        });
    });
});
