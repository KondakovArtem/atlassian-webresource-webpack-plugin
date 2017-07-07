const assert = require('assert');
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('async-chunks', function () {
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let entryApp;
    let entryFoo;
    let resourceApp;
    let resourceFoo;
    let dependencyApp;
    let dependencyFoo;

    function getChild(node, name) {
        return node.children.filter(node => node.name === name)
    }

    function getContent(nodes) {
        return nodes.map(node => node.content);
    }

    function getAttribute(nodes, attribute) {
        return nodes.map(node => node.attributes[attribute]);
    }

    beforeEach((done) => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entryApp = results.root.children.find(node => node.attributes.key.startsWith("entrypoint-app"));
            entryFoo = results.root.children.find(node => node.attributes.key.startsWith("entrypoint-foo"));
            resourceApp = getAttribute(getChild(entryApp, 'resource'), 'name');
            resourceFoo = getAttribute(getChild(entryFoo, 'resource'), 'name');
            dependencyApp = getContent(getChild(entryApp, 'dependency'));
            dependencyFoo = getContent(getChild(entryFoo, 'dependency'));
            done();
        });
    });

    it('should create a webresources with dependencies and resources as appropriate', () => {
        assert.ok(entryApp);
        assert.equal(resourceApp.length, 3);
        assert.equal(dependencyApp.length, 1);

        assert.ok(entryFoo);
        assert.equal(resourceFoo.length, 3);
        assert.equal(dependencyFoo.length, 0);

        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    it('should add runtime/commons chunk resource to both entrypoint-webresources', () => {
        assert.equal(resourceApp[0], 'runtime.js');
        assert.equal(resourceApp[1], 'commons.js');
        assert.equal(resourceApp[2], 'app.js');

        assert.equal(resourceFoo[0], 'runtime.js');
        assert.equal(resourceFoo[1], 'commons.js');
        assert.equal(resourceFoo[2], 'foo.js');
    });

    it('should add dependencies as appropriate', () => {
        assert.equal(dependencyApp[0], 'jira.webresources:jquery');
    });
});
