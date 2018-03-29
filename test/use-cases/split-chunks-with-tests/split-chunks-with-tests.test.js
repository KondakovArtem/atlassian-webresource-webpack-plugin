const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('split-chunks-with-tests', function() {
    this.timeout(10000);
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let entryApp;
    let entryApp2;
    let splitChunkCommons;
    let testEntryApp;
    let testEntryApp2;

    function getChild(node, name) {
        return node.children.filter(node => node.name === name);
    }

    function getContent(nodes) {
        return nodes.map(node => node.content);
    }

    function getAttribute(nodes, attribute) {
        return nodes.map(node => node.attributes[attribute]);
    }

    before(done => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entryApp = results.root.children.find(node => node.attributes.key === 'entrypoint-app');
            entryApp2 = results.root.children.find(node => node.attributes.key === 'entrypoint-app2');
            splitChunkCommons = results.root.children.find(node => node.attributes.key === 'split_app~app2');
            testEntryApp = results.root.children.find(node => node.attributes.key === '__test__entrypoint-app');
            testEntryApp2 = results.root.children.find(node => node.attributes.key === '__test__entrypoint-app2');
            done();
        });
    });

    it('should create a webresources with dependencies and resources as appropriate', () => {
        assert.ok(entryApp, 'has entrypoint for app');
        assert.ok(entryApp2, 'has entrypoint for app2');
        assert.ok(splitChunkCommons, 'has entrypoint for split chunk');

        assert.equal(error, null, 'has no error output');
        assert.equal(stats.hasErrors(), false, 'has no errors');
        assert.equal(stats.hasWarnings(), false, 'has no warnings');
    });

    describe('split chunk for common modules', () => {
        it('should create a web-resource for the split chunk', () => {
            assert.ok(splitChunkCommons);
            assert.equal(
                getChild(splitChunkCommons, 'resource').length,
                1,
                'split chunk contains unexpected amount of resources'
            );
            assert.equal(
                getChild(splitChunkCommons, 'dependency').length,
                2,
                'split chunk contains unexpected amount of dependencies'
            );
        });

        it('should contain all dependencies specified in at least 2 entry-points', () => {
            const deps = getContent(getChild(splitChunkCommons, 'dependency'));
            assert.equal(deps[0], 'jira.webresources:jquery', 'jquery dependency not found in split chunk');
            assert.equal(
                deps[1],
                'com.atlassian.plugin.jslibs:underscore-1.4.4',
                'underscore dependency not found in split chunk'
            );
        });
    });

    describe('entry points', () => {
        let depsApp;
        let depsApp2;
        beforeEach(() => {
            depsApp = getContent(getChild(entryApp, 'dependency'));
            depsApp2 = getContent(getChild(entryApp2, 'dependency'));
        });
        it('should not have direct dependency to commonly used deps', () => {
            assert.notInclude(depsApp, 'jira.webresources:jquery', 'unexpected dependency found');
            assert.notInclude(depsApp, 'com.atlassian.plugin.jslibs:underscore-1.4.4', 'unexpected dependency found');
            assert.notInclude(depsApp2, 'jira.webresources:jquery', 'unexpected dependency found');
            assert.notInclude(depsApp2, 'com.atlassian.plugin.jslibs:underscore-1.4.4', 'unexpected dependency found');
        });

        it('should have dependency to split chunks', () => {
            assert.include(depsApp, 'com.atlassian.plugin.test:split_app~app2', 'expected dependency not found');
            assert.include(depsApp2, 'com.atlassian.plugin.test:split_app~app2', 'expected dependency not found');
        });
    });

    describe('test web-resources', () => {
        let depsTestApp;
        let depsTestApp2;
        let resourcesTestApp;
        let resourcesTestApp2;
        beforeEach(() => {
            depsTestApp = getContent(getChild(testEntryApp, 'dependency'));
            depsTestApp2 = getContent(getChild(testEntryApp2, 'dependency'));
            resourcesTestApp = getAttribute(getChild(testEntryApp, 'resource'), 'name');
            resourcesTestApp2 = getAttribute(getChild(testEntryApp2, 'resource'), 'name');
        });

        it('should contain the dependencies as specified in the split chunks', () => {
            assert.include(depsTestApp, 'jira.webresources:jquery', 'expected dependency not found');
            assert.include(
                depsTestApp,
                'com.atlassian.plugin.jslibs:underscore-1.4.4',
                'expected dependency not found'
            );
            assert.include(depsTestApp2, 'jira.webresources:jquery', 'expected dependency not found');
            assert.include(
                depsTestApp2,
                'com.atlassian.plugin.jslibs:underscore-1.4.4',
                'expected dependency not found'
            );
        });

        it('should contain the resources as specified in its entry point - including commons ones', () => {
            assert.strictEqual(
                resourcesTestApp[0],
                'qunit-require-shim-DEV_PSEUDO_HASH.js',
                'expected resource not found'
            );
            assert.strictEqual(
                resourcesTestApp[1],
                'test/use-cases/split-chunks-with-tests/src/bar.js',
                'expected resource not found'
            );
            assert.strictEqual(
                resourcesTestApp[2],
                'test/use-cases/split-chunks-with-tests/src/foo.js',
                'expected resource not found'
            );
            assert.strictEqual(
                resourcesTestApp[3],
                'test/use-cases/split-chunks-with-tests/src/app.js',
                'expected resource not found'
            );

            assert.strictEqual(
                resourcesTestApp2[0],
                'qunit-require-shim-DEV_PSEUDO_HASH.js',
                'expected resource not found'
            );
            assert.strictEqual(
                resourcesTestApp2[1],
                'test/use-cases/split-chunks-with-tests/src/bar.js',
                'expected resource not found'
            );
            assert.strictEqual(
                resourcesTestApp2[2],
                'test/use-cases/split-chunks-with-tests/src/foo2.js',
                'expected resource not found'
            );
            assert.strictEqual(
                resourcesTestApp2[3],
                'test/use-cases/split-chunks-with-tests/src/app2.js',
                'expected resource not found'
            );

            assert.strictEqual(resourcesTestApp.length, 4, 'unexpected number of resources');
            assert.strictEqual(resourcesTestApp2.length, 4, 'unexpected number of resources');
        });

        it('should not contain resources from other entry points', () => {
            assert.notInclude(
                resourcesTestApp2,
                'test/use-cases/split-chunks-with-tests/src/foo.js',
                'unexpected resource found'
            );
            assert.notInclude(
                resourcesTestApp2,
                'test/use-cases/split-chunks-with-tests/src/app.js',
                'unexpected resource found'
            );

            assert.notInclude(
                resourcesTestApp,
                'test/use-cases/split-chunks-with-tests/src/foo2.js',
                'unexpected resource found'
            );
            assert.notInclude(
                resourcesTestApp,
                'test/use-cases/split-chunks-with-tests/src/app2.js',
                'unexpected resource found'
            );
        });
    });
});
