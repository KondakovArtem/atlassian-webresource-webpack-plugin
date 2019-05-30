const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('async-chunks-of-async-chunks-with-multiple-entrypoints', function() {
    const config = require('./webpack.config.js');

    let stats;
    let runtime;
    let runtime2;
    let app;
    let app2;
    let splitAppAndApp2;
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
            runtime = results.root.children.find(n => n.attributes.key === 'entrypoint-app');
            runtime2 = results.root.children.find(n => n.attributes.key === 'entrypoint-app2');
            app = results.root.children.find(n => n.attributes.key === 'split_app');
            app2 = results.root.children.find(n => n.attributes.key === 'split_app2');
            splitAppAndApp2 = results.root.children.find(n => n.attributes.key === 'split_app~app2');
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
        assert.ok(runtime2, 'runtime2 does not exist');
        assert.ok(app, 'app does not exist');
        assert.ok(app2, 'app2 does not exist');
        assert.ok(splitAppAndApp2, 'splitAppAndApp2 does not exist');
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

    describe('dependencies per web-resource', () => {
        let runtimeDeps;
        let runtimeDeps2;
        let appDeps;
        let appDeps2;
        let splitAppAndApp2Deps;
        let asyncBarDeps;
        let asyncFooDeps;
        let asyncAsyncBarDeps;
        let asyncAsyncBarTwoDeps;
        let asyncAsyncAsyncBarDeps;

        beforeEach(() => {
            runtimeDeps = getContent(getDependencies(runtime));
            runtimeDeps2 = getContent(getDependencies(runtime2));
            appDeps = getContent(getDependencies(app));
            appDeps2 = getContent(getDependencies(app2));
            splitAppAndApp2Deps = getContent(getDependencies(splitAppAndApp2));
            asyncBarDeps = getContent(getDependencies(asyncBar));
            asyncFooDeps = getContent(getDependencies(asyncFoo));
            asyncAsyncBarDeps = getContent(getDependencies(asyncAsyncBar));
            asyncAsyncBarTwoDeps = getContent(getDependencies(asyncAsyncBarTwo));
            asyncAsyncAsyncBarDeps = getContent(getDependencies(asyncAsyncAsyncBar));
        });

        it('adds the correct split chunk dependencies to the entrypoints', () => {
            assert.include(runtimeDeps, 'com.atlassian.plugin.test:split_app~app2');
            assert.include(runtimeDeps, 'com.atlassian.plugin.test:split_app');

            assert.include(runtimeDeps2, 'com.atlassian.plugin.test:split_app~app2');
            assert.include(runtimeDeps2, 'com.atlassian.plugin.test:split_app2');
        });

        it('adds shared provided dependencies only to the entry point', () => {
            assert.include(splitAppAndApp2Deps, 'com.atlassian.plugin.jslibs:underscore-1.4.4');

            assert.notInclude(runtimeDeps, 'com.atlassian.plugin.jslibs:underscore-1.4.4');
            assert.notInclude(runtimeDeps2, 'com.atlassian.plugin.jslibs:underscore-1.4.4');
            assert.notInclude(appDeps, 'com.atlassian.plugin.jslibs:underscore-1.4.4');
            assert.notInclude(appDeps2, 'com.atlassian.plugin.jslibs:underscore-1.4.4');
            assert.notInclude(asyncBarDeps, 'com.atlassian.plugin.jslibs:underscore-1.4.4');
            assert.notInclude(asyncFooDeps, 'com.atlassian.plugin.jslibs:underscore-1.4.4');
            assert.notInclude(asyncAsyncBarDeps, 'com.atlassian.plugin.jslibs:underscore-1.4.4');
            assert.notInclude(asyncAsyncBarTwoDeps, 'com.atlassian.plugin.jslibs:underscore-1.4.4');
            assert.notInclude(asyncAsyncAsyncBarDeps, 'com.atlassian.plugin.jslibs:underscore-1.4.4');
        });

        it('adds async-chunk-only deps only to the async-chunk-webresource', () => {
            assert.include(asyncBarDeps, 'jira.webresources:jquery');

            assert.notInclude(splitAppAndApp2Deps, 'jira.webresources:jquery');
            assert.notInclude(runtimeDeps, 'jira.webresources:jquery');
            assert.notInclude(runtimeDeps2, 'jira.webresources:jquery');
            assert.notInclude(appDeps, 'jira.webresources:jquery');
            assert.notInclude(appDeps2, 'jira.webresources:jquery');
            assert.notInclude(asyncFooDeps, 'jira.webresources:jquery');
            assert.notInclude(asyncAsyncBarDeps, 'jira.webresources:jquery');
            assert.notInclude(asyncAsyncBarTwoDeps, 'jira.webresources:jquery');
            assert.notInclude(asyncAsyncAsyncBarDeps, 'jira.webresources:jquery');
        });
    });
});
