const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('commons-chunks', function() {
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let entryApp;
    let entryApp2;
    let commonsChunkRuntime;
    let commonsChunkCommons;
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
            commonsChunkRuntime = results.root.children.find(node => node.attributes.key === 'commons_runtime');
            commonsChunkCommons = results.root.children.find(node => node.attributes.key === 'commons_commons');
            testEntryApp = results.root.children.find(node => node.attributes.key === '__test__entrypoint-app');
            testEntryApp2 = results.root.children.find(node => node.attributes.key === '__test__entrypoint-app2');
            done();
        });
    });

    it('should create a webresources with dependencies and resources as appropriate', () => {
        assert.ok(entryApp);
        assert.ok(entryApp2);
        assert.ok(commonsChunkRuntime);
        assert.ok(commonsChunkCommons);

        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    it('should create a web-resource for the runtime chunk', () => {
        assert.ok(commonsChunkRuntime);
        assert.equal(
            getChild(commonsChunkRuntime, 'resource').length,
            1,
            'runtime contains unexpected amount of resources'
        );
        assert.equal(
            getChild(commonsChunkRuntime, 'dependency').length,
            0,
            'runtime contains unexpected amount of dependencies'
        );
    });

    describe('commons chunk for common modules', () => {
        it('should create a web-resource for the commons chunk', () => {
            assert.ok(commonsChunkCommons);
            assert.equal(
                getChild(commonsChunkCommons, 'resource').length,
                1,
                'commons chunk contains unexpected amount of resources'
            );
            assert.equal(
                getChild(commonsChunkCommons, 'dependency').length,
                2,
                'commons chunk contains unexpected amount of dependencies'
            );
        });

        it('should contain all dependencies specified in at least 2 entry-points', () => {
            const deps = getContent(getChild(commonsChunkCommons, 'dependency'));
            assert.equal(deps[0], 'jira.webresources:jquery', 'jquery dependency not found in commons chunk');
            assert.equal(
                deps[1],
                'com.atlassian.plugin.jslibs:underscore-1.4.4',
                'underscore dependency not found in commons chunk'
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

        it('should have dependency to commons chunks', () => {
            assert.include(depsApp, 'com.atlassian.plugin.test:commons_runtime', 'expected dependency not found');
            assert.include(depsApp, 'com.atlassian.plugin.test:commons_commons', 'expected dependency not found');
            assert.include(depsApp2, 'com.atlassian.plugin.test:commons_runtime', 'expected dependency not found');
            assert.include(depsApp2, 'com.atlassian.plugin.test:commons_commons', 'expected dependency not found');
        });
    });

    describe('test web-resources', () => {
        it('should not have any test entries', () => {
            assert.equal(testEntryApp, undefined, 'test entrypoint is undefined');
            assert.equal(testEntryApp2, undefined, 'test entrypoint is undefined');
        });
    });
});
