const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('resource-parameters', function() {
    const config = require('./webpack.config.js');

    const byExtension = (resources, ext) => resources.filter(r => r.attributes.name.endsWith(ext))[0];

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

    it('should add a param to a resource', () => {
        assert.ok(assets);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
        assert.equal(resources.length, 3);

        const png = byExtension(resources, '.png');
        assert.equal(path.extname(png.attributes.name), '.png');
        assert.equal(png.children.length, 1, 'should contain a "param" child.');
        assert.equal(png.children[0].attributes.name, 'bar', 'Type of param.');
        assert.equal(png.children[0].attributes.value, 'baz', 'Value of param.');
        const svg = byExtension(resources, '.svg');
        assert.equal(svg.attributes.type, 'download');
        assert.equal(svg.children.length, 2, 'should contain two "param" children.');
        assert.equal(svg.children[0].attributes.name, 'content-type', 'Type of param.');
        assert.equal(svg.children[0].attributes.value, 'image/svg+xml', 'Value of param.');
        assert.equal(svg.children[1].attributes.name, 'foo', 'Type of param.');
        assert.equal(svg.children[1].attributes.value, 'bar', 'Value of param.');
    });

    it('should include the last defined value for a given parameter', () => {
        const jpg = byExtension(resources, '.jpg');
        assert.equal(jpg.children.length, 2, 'should contain "param" children.');
        assert.equal(jpg.children[0].attributes.name, 'bar');
        assert.equal(jpg.children[1].attributes.name, 'duped');
        assert.equal(jpg.children[1].attributes.value, 'second', 'Last declared value should win.');
    });

    it('should add image/svg+xml by default for svg files', done => {
        const svgConfig = require('./webpack.svg.config');
        webpack(svgConfig, (err, st) => {
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            assets = results.root.children.find(n => n.attributes.key.startsWith('assets'));
            resources = assets.children.filter(n => n.name === 'resource');

            const svg = byExtension(resources, '.svg');
            assert.equal(svg.attributes.type, 'download');
            assert.equal(svg.children.length, 1, 'should contain a "param" child.');
            assert.equal(svg.children[0].attributes.name, 'content-type', 'Type of param.');
            assert.equal(svg.children[0].attributes.value, 'image/svg+xml', 'Value of param.');
            done();
        });
    });
});
