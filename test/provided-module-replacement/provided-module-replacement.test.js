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
    let entry;
    let dependencies;

    function getDependencies(node) {
        return node.children.filter(node => node.name === "dependency")
    }

    function getContent(nodes) {
        return nodes.map(node => node.content);
    }

    beforeEach((done) => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entry = results.root.children.find(node => node.attributes.key.startsWith("entry"));
            dependencies = getContent(getDependencies(entry));
            done();
        });
    });

    it('should create a webresource with dependencies for each async chunk', () => {
        assert.ok(entry);
        assert.ok(dependencies);
        assert.equal(2, dependencies.length)
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    it('add a dependency for the provided module to the webresource', () => {
        assert.ok(dependencies.includes('jira.webresources:jquery'));
        assert.ok(dependencies.includes('com.atlassian.plugin.jslibs:underscore-1.4.4'));
    });
});
