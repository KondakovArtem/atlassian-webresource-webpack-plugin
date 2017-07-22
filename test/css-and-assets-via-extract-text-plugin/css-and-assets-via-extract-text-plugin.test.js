const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('css-and-assets-via-extract-text-plugin', function () {
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let entrypoint;
    let resources;

    beforeEach((done) => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entrypoint = results.root.children.find(node => node.attributes.key.startsWith('entrypoint'));
            resources = entrypoint.children.filter(node => node.name === 'resource');
            done();
        });
    });

    it('should build without failing', () => {
        assert.ok(entrypoint);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
        assert.equal(resources[0].attributes.type, 'download');
        assert.equal(resources[0].attributes.name, 'app.js');
    });
    
    it('should add the stylesheet and the contained assets of the stylesheet as resources to the entry', () => {
        assert.ok(entrypoint);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
        assert.equal(resources.length, 3);
        assert.equal(resources[0].attributes.name, 'app.js');
        assert.equal(resources[1].attributes.name, 'app.css');
        assert.equal(path.extname(resources[2].attributes.name), '.png');
    });
});
