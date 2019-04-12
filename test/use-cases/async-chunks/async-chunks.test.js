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
            asyncChunk1 = results.root.children.find(n => n.attributes.key === '0');
            asyncChunk2 = results.root.children.find(n => n.attributes.key === '1');
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
        const expectedRuntimeAdjustment = `
/******/ 		var WRMChildChunkIds = {"0":true,"1":true};
/******/ 		if (WRMChildChunkIds[chunkId]) {
/******/ 		    if(installedChunks[chunkId] === 0) { // 0 means "already installed".
/******/ 		        return Promise.resolve();
/******/ 		    }
/******/
/******/ 		    if (installedChunks[chunkId]) {
/******/ 		        return installedChunks[chunkId][2];
/******/ 		    }
/******/
/******/ 		    return Promise.all([
/******/ 		        new Promise(function(resolve, reject) {
/******/ 		            installedChunks[chunkId] = [resolve, reject];
/******/ 		        }),
/******/ 		        new Promise(function(resolve, reject) {
/******/ 		            WRM.require('wrc!com.atlassian.plugin.test:' + chunkId).then(resolve, reject);
/******/ 		        }),
/******/ 		    ]);
/******/ 		}`;

        assert.include(bundleFile, expectedRuntimeAdjustment);
    });

    it('adds shared provided dependencies only to the entry point', () => {
        const appDeps = getContent(getDependencies(app));
        const async1Deps = getContent(getDependencies(asyncChunk1));
        const async2Deps = getContent(getDependencies(asyncChunk2));

        assert.ok(appDeps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'));
        assert.notEqual(async1Deps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'), true);
        assert.notEqual(async2Deps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'), true);
    });

    it('adds async-chunk-only deps only to the async-chunk-webresource', () => {
        const entryDeps = getContent(getDependencies(app));
        const async1Deps = getContent(getDependencies(asyncChunk1));
        const async2Deps = getContent(getDependencies(asyncChunk2));

        assert.ok(async1Deps.includes('jira.webresources:jquery'));
        assert.notEqual(entryDeps.includes('jira.webresources:jquery'), true);
        assert.notEqual(async2Deps.includes('jira.webresources:jquery'), true);
    });
});
