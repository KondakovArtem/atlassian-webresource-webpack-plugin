const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('async-chunks', function() {
    const config = require('./webpack.config.js');

    let stats;
    let entry;
    let asyncChunk1;
    let asyncChunk2;

    function getDependencies(node) {
        return node.children.filter(n => n.name === 'dependency');
    }

    function getContent(nodes) {
        return nodes.map(node => node.content);
    }

    beforeEach(done => {
        webpack(config, (err, st) => {
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entry = results.root.children.find(node => node.attributes.key.startsWith('entry'));
            asyncChunk1 = results.root.children.find(node => node.attributes.key === '0');
            asyncChunk2 = results.root.children.find(node => node.attributes.key === '1');
            done();
        });
    });

    it('should create a webresource for each async chunk', () => {
        assert.ok(entry, 'entry does not exist');
        assert.ok(asyncChunk1, 'asyncChunk1 does not exist');
        assert.ok(asyncChunk2, 'asyncChunk2 does not exist');
        assert.equal(stats.hasErrors(), false, 'should not have errors');
        assert.equal(stats.hasWarnings(), false, 'should not have warnings');
    });

    it('should inject a WRM pre-condition checker into the webpack runtime', () => {
        // setup
        const bundleFile = fs.readFileSync(path.join(targetDir, 'app.js'), 'utf-8');
        const containsRuntime = bundleFile.includes(`
/******/ 		var WRMChildChunkIds = {"0":true,"1":true};
/******/ 		if (WRMChildChunkIds[chunkId]) {
/******/ 		    WRM.require('wrc!com.atlassian.plugin.test:' + chunkId)
/******/ 		    return promise;
/******/ 		}`);

        assert.ok(containsRuntime);
    });

    it('should create a webresource for each async chunk', () => {
        assert.ok(asyncChunk1);
        assert.ok(asyncChunk2);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    it('adds shared provided dependencies only to the entry point', () => {
        const entryDeps = getContent(getDependencies(entry));
        const async1Deps = getContent(getDependencies(asyncChunk1));
        const async2Deps = getContent(getDependencies(asyncChunk2));

        assert.ok(entryDeps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'));
        assert.notEqual(async1Deps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'), true);
        assert.notEqual(async2Deps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'), true);
    });

    it('adds async-chunk-only deps only to the async-chunk-webresource', () => {
        const entryDeps = getContent(getDependencies(entry));
        const async1Deps = getContent(getDependencies(asyncChunk1));
        const async2Deps = getContent(getDependencies(asyncChunk2));

        assert.ok(async1Deps.includes('jira.webresources:jquery'));
        assert.notEqual(entryDeps.includes('jira.webresources:jquery'), true);
        assert.notEqual(async2Deps.includes('jira.webresources:jquery'), true);
    });
});
