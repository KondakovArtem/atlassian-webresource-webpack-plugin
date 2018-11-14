const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('provided-modules-replacement', function() {
    let stats;
    let error;
    let entry;
    let dependencies;

    function getDependencies(node) {
        return node.children.filter(n => n.name === 'dependency');
    }

    function getContent(nodes) {
        return nodes.map(n => n.content);
    }

    function runWebpack(config, done) {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entry = results.root.children.find(n => n.attributes.key.startsWith('entry'));
            dependencies = getContent(getDependencies(entry));
            done();
        });
    }

    function runTheTestsFor(config) {
        beforeEach(done => runWebpack(config, done));

        it('should create a webresource with dependencies for each async chunk', () => {
            assert.ok(entry);
            assert.ok(dependencies);
            assert.equal(stats.hasErrors(), false);
            assert.equal(stats.hasWarnings(), false);
        });

        it('add a dependency for the provided module to the webresource', () => {
            assert.include(dependencies, 'jira.webresources:jquery');
            assert.include(dependencies, 'com.atlassian.plugin.jslibs:underscore-1.4.4');
            assert.include(dependencies, 'a.plugin.key:webresource-key');
        });
    }

    describe('using a map', () => {
        const config = require('./webpack.config.with-map.js');
        runTheTestsFor(config);
    });

    describe('using a plain object', () => {
        const config = require('./webpack.config.with-object.js');
        runTheTestsFor(config);
    });
});
