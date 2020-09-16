const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('css-and-assets-via-style-loader', () => {
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let assets;
    let resources;

    beforeEach(done => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            assets = results.root.children.find(n => n.attributes.key.startsWith('assets'));
            resources = assets.children.filter(n => n.name === 'resource');
            done();
        });
    });

    it('should create an "asset"-webresource containing the image referenced in the stylesheet', () => {
        assert.ok(assets);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
        assert.equal(resources[0].attributes.type, 'download');
        assert.equal(path.extname(resources[0].attributes.name), '.png');
    });

    it('should interpolate the CSS rules in to the JS code', () => {
        // setup
        const bundleFile = fs.readFileSync(path.join(targetDir, 'app.js'), 'utf-8');
        const expectedLine = /const html = `<div class="\$\{(.*?)\}"><div class="\$\{(.*?)\}"><\/div><\/div>`;/;

        const result = expectedLine.exec(bundleFile);

        assert.ok(result.length, 2);
        assert.include(result[1], '.wurst', 'first variable should be interpolated');
        assert.include(result[2], '.tricky', 'second variable should be interpolated');
    });
});
