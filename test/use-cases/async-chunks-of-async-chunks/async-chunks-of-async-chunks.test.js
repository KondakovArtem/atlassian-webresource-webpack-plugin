const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('async-chunks-of-async-chunks', function() {
    const config = require('./webpack.config.js');

    let stats;
    let runtime;
    let app;
    let asyncBar;
    let asyncFoo;
    let asyncAsyncBar;
    let asyncAsyncBarTwo;
    let asyncAsyncAsyncBar;

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
            asyncBar = results.root.children.find(n => n.attributes.key === 'async-bar');
            asyncFoo = results.root.children.find(n => n.attributes.key === 'async-foo');
            asyncAsyncBar = results.root.children.find(n => n.attributes.key === 'async-async-bar');
            asyncAsyncBarTwo = results.root.children.find(n => n.attributes.key === 'async-async-bar-two');
            asyncAsyncAsyncBar = results.root.children.find(n => n.attributes.key === 'async-async-async-bar');
            done();
        });
    });

    it('should create a webresource for each async chunk', () => {
        assert.ok(runtime, 'runtime does not exist');
        assert.ok(app, 'app does not exist');
        assert.ok(asyncBar, '"async-bar" does not exist');
        assert.ok(asyncFoo, '"async-foo" does not exist');
        assert.ok(asyncAsyncBar, '"async-async-bar" does not exist');
        assert.ok(asyncAsyncBarTwo, '"async-async-bar-two" does not exist');
        assert.ok(asyncAsyncAsyncBar, '"async-async-async-bar" does not exist');
        assert.equal(stats.hasErrors(), false, 'should not have errors');
        assert.equal(stats.hasWarnings(), false, 'should not have warnings');
    });

    it('should inject a WRM pre-condition checker into the webpack runtime', () => {
        // setup
        const bundleFile = fs.readFileSync(path.join(targetDir, 'runtime~app.js'), 'utf-8');
        const expectedRuntimeAdjustment = `
/******/ 		var promises = [];
/******/
/******/ 		if(installedChunks[chunkId] === 0) { // 0 means "already installed".
/******/ 		    return Promise.resolve();
/******/ 		}
/******/
/******/ 		if (installedChunks[chunkId]) {
/******/ 		    return installedChunks[chunkId][2];
/******/ 		}
/******/
/******/ 		promises.push(
/******/ 		    new Promise(function(resolve, reject) {
/******/ 		        installedChunks[chunkId] = [resolve, reject];
/******/ 		    }),
/******/ 		    new Promise(function(resolve, reject) {
/******/ 		        WRM.require('wrc!com.atlassian.plugin.test:' + chunkId).then(resolve, reject);
/******/ 		    })
/******/ 		);
/******/ 		return installedChunks[chunkId][2] = Promise.all(promises);`;

        assert.include(bundleFile, expectedRuntimeAdjustment);
    });

    it('adds shared provided dependencies only to the entry point', () => {
        const appDeps = getContent(getDependencies(app));
        const asyncBarDeps = getContent(getDependencies(asyncBar));
        const asyncFooDeps = getContent(getDependencies(asyncFoo));
        const asyncAsyncBarDeps = getContent(getDependencies(asyncAsyncBar));
        const asyncAsyncBarTwoDeps = getContent(getDependencies(asyncAsyncBarTwo));
        const asyncAsyncAsyncBarDeps = getContent(getDependencies(asyncAsyncAsyncBar));

        assert.ok(appDeps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'));
        assert.notEqual(asyncBarDeps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'), true);
        assert.notEqual(asyncFooDeps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'), true);
        assert.notEqual(asyncAsyncBarDeps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'), true);
        assert.notEqual(asyncAsyncBarTwoDeps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'), true);
        assert.notEqual(asyncAsyncAsyncBarDeps.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'), true);
    });

    it('adds async-chunk-only deps only to the async-chunk-webresource', () => {
        const entryDeps = getContent(getDependencies(app));
        const asyncBarDeps = getContent(getDependencies(asyncBar));
        const asyncFooDeps = getContent(getDependencies(asyncFoo));
        const asyncAsyncBarDeps = getContent(getDependencies(asyncAsyncBar));
        const asyncAsyncBarTwoDeps = getContent(getDependencies(asyncAsyncBarTwo));
        const asyncAsyncAsyncBarDeps = getContent(getDependencies(asyncAsyncAsyncBar));

        assert.notEqual(entryDeps.includes('jira.webresources:jquery'));
        assert.ok(asyncBarDeps.includes('jira.webresources:jquery'), true);
        assert.notEqual(asyncFooDeps.includes('jira.webresources:jquery'), true);
        assert.notEqual(asyncAsyncBarDeps.includes('jira.webresources:jquery'), true);
        assert.notEqual(asyncAsyncBarTwoDeps.includes('jira.webresources:jquery'), true);
        assert.notEqual(asyncAsyncAsyncBarDeps.includes('jira.webresources:jquery'), true);
    });
});
