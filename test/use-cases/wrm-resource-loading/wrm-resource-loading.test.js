const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');
const baseContexts = require('../../../src/settings/base-contexts');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('wrm-resource-loading', function () {
    let stats;
    let error;
    let entry;

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
            done();
        });
    }

    function runTheTestsFor(config) {
        beforeEach((done) => runWebpack(config, done));

        it('should run without error', () => {
            assert.ok(entry);
            assert.equal(stats.hasErrors(), false);
            assert.equal(stats.hasWarnings(), false);
        });

        it('has a Soy transformation', () => {
            let transformNodes = entry.children.filter(node => node.name === 'transformation');
            let soyTransformNode = transformNodes.find(node => node.attributes.extension === 'soy');
            assert.notEqual(soyTransformNode, null, 'should have a soy transform');
            assert.deepPropertyVal(soyTransformNode, 'children[0].name', 'transformer');
            assert.deepPropertyVal(soyTransformNode, 'children[0].attributes.key', 'soyTransformer');
        });

        it('has a LESS transformation', () => {
            let transformNodes = entry.children.filter(node => node.name === 'transformation');
            let lessTransformNode = transformNodes.find(node => node.attributes.extension === 'less');
            assert.notEqual(lessTransformNode, null, 'should have a soy transform');
            assert.deepPropertyVal(lessTransformNode, 'children[0].name', 'transformer');
            assert.deepPropertyVal(lessTransformNode, 'children[0].attributes.key', 'lessTransformer');
        });

        it('has the appropriate external resources', () => {
            let resourceNodes = entry.children.filter(node => node.name === 'resource');
            let resources = resourceNodes.map(node => node.attributes);
            assert.includeDeepMembers(resources, [
                { name: 'ultimate/name/at/runtime.js', location: 'path/to/my/template.soy', type: 'download' },
                { name: 'ultimate/name/at/runtime.css', location: 'path/to/my/styles.less', type: 'download' }
            ]);
        });

        it('has no additional web-resource dependencies', () => {
            let dependencyNodes = entry.children.filter(node => node.name === 'dependency');
            let dependencies = getContent(dependencyNodes);
            assert.sameMembers(dependencies, baseContexts, 'should only include the base dependencies, but no others');
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
