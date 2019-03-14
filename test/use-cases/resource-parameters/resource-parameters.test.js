const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('resource-parameters', function() {
    const config = require('./webpack.config.js');

    let stats;
    let assets;
    let resources;

    beforeEach(done => {
        webpack(config, (err, st) => {
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            assets = results.root.children.find(n => n.attributes.key.startsWith('assets'));
            resources = assets.children.filter(n => n.name === 'resource');
            done();
        });
    });

    it('should add a param to a resource if it is of a specific file type', () => {
        assert.ok(assets);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
        assert.equal(resources.length, 2);

        const svg = resources[1];
        assert.equal(path.extname(svg.attributes.name), '.svg');
        assert.equal(svg.attributes.type, 'download');
        assert.equal(svg.children.length, 2, 'should contain two "param" children.');
        assert.equal(svg.children[0].attributes.name, 'content-type', 'Type of param.');
        assert.equal(svg.children[0].attributes.value, 'image/svg+xml', 'Value of param.');
    });

    it('should add a param to all resources if the file type is set to *', () => {
        assert.ok(assets);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
        assert.equal(resources.length, 2);

        const png = resources[0];
        assert.equal(path.extname(png.attributes.name), '.png');
        assert.equal(png.children.length, 1, 'should contain a "param" child.');
        assert.equal(png.children[0].attributes.name, 'foo', 'Type of param.');
        assert.equal(png.children[0].attributes.value, 'bar', 'Value of param.');

        const svg = resources[1];
        assert.equal(path.extname(svg.attributes.name), '.svg');
        assert.equal(svg.attributes.type, 'download');
        assert.equal(svg.children.length, 2, 'should contain two "param" children.');
        assert.equal(svg.children[1].attributes.name, 'foo', 'Type of param.');
        assert.equal(svg.children[1].attributes.value, 'bar', 'Value of param.');
    });
});
