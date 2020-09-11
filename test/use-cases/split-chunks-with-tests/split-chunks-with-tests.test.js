const chai = require('chai');
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const assert = chai.assert;

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

const uuidLength = require('uuid').v4().length;

describe('split-chunks-with-tests', function () {
    this.timeout(10000);
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let entryApp;
    let entryApp2;
    let splitChunkShared;
    let testEntryApp;
    let testEntryApp2;

    function getChild(node, name) {
        return node.children.filter(n => n.name === name);
    }

    function getContent(nodes) {
        return nodes.map(n => n.content);
    }

    function getAttribute(nodes, attribute) {
        return nodes.map(n => n.attributes[attribute]);
    }

    before(done => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entryApp = results.root.children.find(n => n.attributes.key === 'entrypoint-app');
            entryApp2 = results.root.children.find(n => n.attributes.key === 'entrypoint-app2');
            splitChunkShared = results.root.children.find(n => n.attributes.key === 'split_app~app2');
            testEntryApp = results.root.children.find(n => n.attributes.key === '__test__entrypoint-app');
            testEntryApp2 = results.root.children.find(n => n.attributes.key === '__test__entrypoint-app2');
            done();
        });
    });

    it('should create a webresources with dependencies and resources as appropriate', () => {
        assert.ok(entryApp, 'has entrypoint for app');
        assert.ok(entryApp2, 'has entrypoint for app2');
        assert.ok(splitChunkShared, 'has entrypoint for split chunk');

        assert.equal(error, null, 'has no error output');
        assert.equal(stats.hasErrors(), false, 'has no errors');
        assert.equal(stats.hasWarnings(), false, 'has no warnings');
    });

    describe('split chunk for shared modules', () => {
        it('should create a web-resource for the split chunk', () => {
            assert.ok(splitChunkShared);
            assert.equal(
                getChild(splitChunkShared, 'resource').length,
                1,
                'split chunk contains unexpected amount of resources'
            );
        });

        it('should contain all dependencies specified in at least 2 entry-points', () => {
            const deps = getContent(getChild(splitChunkShared, 'dependency'));
            assert.include(deps, 'jira.webresources:jquery', 'jquery dependency not found in split chunk');
            assert.include(
                deps,
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
        it('should not have direct dependency to shared deps', () => {
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
        const extLength = 3;

        it('should contain the dependencies as specified in the split chunks', () => {
            const depsTestApp = getContent(getChild(testEntryApp, 'dependency'));
            const depsTestApp2 = getContent(getChild(testEntryApp2, 'dependency'));
            assert.includeMembers(
                depsTestApp,
                ['jira.webresources:jquery', 'com.atlassian.plugin.jslibs:underscore-1.4.4'],
                'expected dependencies not found'
            );
            assert.includeMembers(
                depsTestApp2,
                ['jira.webresources:jquery', 'com.atlassian.plugin.jslibs:underscore-1.4.4'],
                'expected dependencies not found'
            );
        });

        it('app1 should contain the resources as specified in its entry point - including those from split chunks', () => {
            const resourcesTestApp = getAttribute(getChild(testEntryApp, 'resource'), 'name');
            const assetsResourceKeyApp1 = resourcesTestApp.shift();
            const assetsResourceUuidApp1 = assetsResourceKeyApp1.substr(-(uuidLength + extLength), uuidLength);

            assert.startsWith(assetsResourceKeyApp1, 'qunit-require-shim-', 'test file not the first resource');
            assert.uuid(assetsResourceUuidApp1, 'v4', 'test file name should include uuid');

            assert.sameMembers(resourcesTestApp, [
                'test/use-cases/split-chunks-with-tests/src/obj.js',
                'test/use-cases/split-chunks-with-tests/src/bar.js',
                'test/use-cases/split-chunks-with-tests/src/foo.js',
                'test/use-cases/split-chunks-with-tests/src/app.js',
            ]);
        });

        it('app2 should contain the resources as specified in its entry point - including those from split chunks', () => {
            const resourcesTestApp2 = getAttribute(getChild(testEntryApp2, 'resource'), 'name');
            const assetsResourceKeyApp2 = resourcesTestApp2.shift();
            const assetsResourceUuidApp2 = assetsResourceKeyApp2.substr(-(uuidLength + extLength), uuidLength);

            assert.startsWith(assetsResourceKeyApp2, 'qunit-require-shim-', 'test file not the first resource');
            assert.uuid(assetsResourceUuidApp2, 'v4', 'test file name should include uuid');

            assert.sameMembers(resourcesTestApp2, [
                'test/use-cases/split-chunks-with-tests/src/obj.js',
                'test/use-cases/split-chunks-with-tests/src/bar.js',
                'test/use-cases/split-chunks-with-tests/src/foo2.js',
                'test/use-cases/split-chunks-with-tests/src/app2.js',
            ]);
        });
    });
});
