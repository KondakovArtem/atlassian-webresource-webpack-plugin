const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('async-chunks', () => {
    const config = require('./webpack.config.js');

    let stats;
    let runtime;
    let app;
    let asyncChunk1;
    let asyncChunk2;

    function getDependencies(node) {
        return node.children.filter(n => n.name === 'dependency');
    }

    function getContent(nodes) {
        return nodes.map(n => n.content);
    }

    beforeEach(done => {
        webpack(config, (err, st) => {
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            runtime = results.root.children.find(n => n.attributes.key.startsWith('entry'));
            app = results.root.children.find(n => n.attributes.key === 'split_app');
            asyncChunk1 = results.root.children.find(n => n.attributes.key === '2');
            asyncChunk2 = results.root.children.find(n => n.attributes.key === '3');
            done();
        });
    });

    it('should create a webresource for each async chunk', () => {
        assert.ok(app, 'entry does not exist');
        assert.ok(asyncChunk1, 'asyncChunk1 does not exist');
        assert.ok(asyncChunk2, 'asyncChunk2 does not exist');
        assert.equal(stats.hasErrors(), false, 'should not have errors');
        assert.equal(stats.hasWarnings(), false, 'should not have warnings');
    });

    it('should inject a WRM pre-condition checker into the webpack runtime', () => {
        // setup
        const bundleFile = fs.readFileSync(path.join(targetDir, 'runtime~app.js'), 'utf-8');
        const expectedRuntimeAdjustment = require('../../fixtures/webpack-runtime-chunks').asyncChunkLoader(
            'com.atlassian.plugin.test'
        );

        assert.include(bundleFile, expectedRuntimeAdjustment);
    });

    describe('web-resource dependencies', () => {
        let entryDeps;
        let appDeps;
        let async1Deps;
        let async2Deps;

        beforeEach(() => {
            entryDeps = getContent(getDependencies(runtime));
            appDeps = getContent(getDependencies(app));
            async1Deps = getContent(getDependencies(asyncChunk1));
            async2Deps = getContent(getDependencies(asyncChunk2));
        });

        it('adds required WRM dependency only to the web-resource with the webpack runtime', () => {
            const WRM_KEY = 'com.atlassian.plugins.atlassian-plugins-webresource-rest:web-resource-manager';
            assert.equal(entryDeps.includes(WRM_KEY), true);
            assert.notEqual(appDeps.includes(WRM_KEY), true);
            assert.notEqual(async1Deps.includes(WRM_KEY), true);
            assert.notEqual(async2Deps.includes(WRM_KEY), true);
        });

        it('adds shared provided dependencies only to the app', () => {
            const UNDERSCORE_KEY = 'com.atlassian.plugin.jslibs:underscore-1.4.4';
            assert.notEqual(entryDeps.includes(UNDERSCORE_KEY), true);
            assert.equal(appDeps.includes(UNDERSCORE_KEY), true);
            assert.notEqual(async1Deps.includes(UNDERSCORE_KEY), true);
            assert.notEqual(async2Deps.includes(UNDERSCORE_KEY), true);
        });

        it('adds async-chunk-only deps only to the async-chunk-webresource', () => {
            const JQUERY_KEY = 'jira.webresources:jquery';
            assert.notEqual(entryDeps.includes(JQUERY_KEY), true);
            assert.notEqual(appDeps.includes(JQUERY_KEY), true);
            assert.equal(async1Deps.includes(JQUERY_KEY), true);
            assert.notEqual(async2Deps.includes(JQUERY_KEY), true);
        });
    });
});
