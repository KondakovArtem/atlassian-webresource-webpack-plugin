const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('wrm-dependency-loading', function () {
    let stats;
    let error;
    let entry;
    let dependencies;

    function getDependencies(node) {
        return node.children.filter(node => node.name === "dependency")
    }

    function getContent(nodes) {
        return nodes.map(node => node.content);
    }

    function runWebpack(config, done) {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entry = results.root.children.find(node => node.attributes.key.startsWith("entry"));
            dependencies = getContent(getDependencies(entry));
            done();
        });
    }

    function runTheTestsFor(config) {
        beforeEach((done) => runWebpack(config, done));

        it('should create a webresource with dependencies', () => {
            assert.ok(entry);
            assert.ok(dependencies);
            assert.equal(stats.hasErrors(), false);
            assert.equal(stats.hasWarnings(), false);
        });

        it('add a dependency for each requested web-resource', () => {
            assert.include(dependencies, 'com.atlassian.plugins.atlassian-plugins-webresource-plugin:data');
            assert.include(dependencies, 'some.weird:web-resource');
            assert.include(dependencies, 'foo-bar:baz');
        });

        it('[legacy] assumes someone meant "wr!" if they typed "wrc!" for their web-resource dependency', () => {
            assert.include(dependencies, 'this-is-actually-a-context-whoops');
        });
    }

    describe('in ES6 modules', function () {
        const config = require('./webpack.config.es6.js');
        runTheTestsFor(config);
    });

    describe('in AMD', function () {
        const config = require('./webpack.config.amd.js');
        runTheTestsFor(config);
    });
});
