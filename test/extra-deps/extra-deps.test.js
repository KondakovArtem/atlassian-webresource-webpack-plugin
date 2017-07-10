const assert = require('assert');
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptors', 'wr-webpack-bundles.xml');

describe('extra-deps', function() {
    let config = require('./webpack.config.js');

    it('outputs declared web-resource dependencies', (done) => {
        webpack(config, (err, stats) => {
            let xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            let results = parse(xmlFile);
            let contextDepsNode = results.root.children.find(node => node.attributes.key === 'context-deps-atl.general');
            let generatedDepsNodes = contextDepsNode.children.filter(node => node.name === 'dependency');
            assert.equal(stats.hasErrors(), false);
            assert.equal(stats.hasWarnings(), false);
            assert.equal(generatedDepsNodes.length, 2);
            assert.equal(generatedDepsNodes[0].content, 'com.atlassian.plugins.jquery:jquery');
            assert.equal(generatedDepsNodes[1].content, 'com.atlassian.auiplugin:ajs-core');
            done();
        });
    });
});
