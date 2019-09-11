const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('async-chunks-named-context', function() {
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

    it('should compile correctly', () => {
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

    it('has a context named after the entry point', () => {
        const getContext = node => node.children.filter(n => n.name === 'context')[0];
        assert.nestedPropertyVal(getContext(asyncBar), 'content', 'async-chunk-async-bar');
        assert.nestedPropertyVal(getContext(asyncFoo), 'content', 'async-chunk-async-foo');
        assert.nestedPropertyVal(getContext(asyncAsyncBar), 'content', 'async-chunk-async-async-bar');
        assert.nestedPropertyVal(getContext(asyncAsyncBarTwo), 'content', 'async-chunk-async-async-bar-two');
        assert.nestedPropertyVal(getContext(asyncAsyncAsyncBar), 'content', 'async-chunk-async-async-async-bar');
    });
});
