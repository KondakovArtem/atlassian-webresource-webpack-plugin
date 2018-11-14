const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('css-and-assets-via-extract-text-plugin', function() {
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let entrypoints;

    const getResourceNodes = webresource => webresource && webresource.children.filter(n => n.name === 'resource');

    before(done => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entrypoints = results.root.children.filter(n => n.attributes.key.startsWith('entry'));
            done();
        });
    });

    it('should build without failing', () => {
        assert.ok(entrypoints);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    describe('for feature one', function() {
        let resources;

        before(() => {
            let webresource = entrypoints.find(n => n.attributes.key.endsWith('feature-one'));
            resources = getResourceNodes(webresource);
        });

        it('should have three resources', () => {
            assert.equal(resources.length, 3);
        });

        it('should include the feature JS file', () => {
            assert.equal(resources[0].attributes.type, 'download');
            assert.equal(resources[0].attributes.name, 'feature-one.js');
        });

        it('should add the stylesheet to the entry', () => {
            assert.equal(resources[1].attributes.type, 'download');
            assert.equal(resources[1].attributes.name, 'feature-one.css');
        });

        it('should add assets contained within the stylesheet as resources to the entry', () => {
            assert.equal(resources[2].attributes.type, 'download');
            assert.equal(path.extname(resources[2].attributes.name), '.png');
        });
    });

    describe('for feature two', function() {
        let resources;

        before(() => {
            let webresource = entrypoints.find(n => n.attributes.key.endsWith('feature-two'));
            resources = getResourceNodes(webresource);
        });

        it('should have two resources', () => {
            assert.equal(resources.length, 2);
        });

        it('should include the feature JS file', () => {
            assert.equal(resources[0].attributes.type, 'download');
            assert.equal(resources[0].attributes.name, 'feature-two.js');
        });

        it('should add the stylesheet to the entry', () => {
            assert.equal(resources[1].attributes.type, 'download');
            assert.equal(resources[1].attributes.name, 'feature-two.css');
        });
    });
});
