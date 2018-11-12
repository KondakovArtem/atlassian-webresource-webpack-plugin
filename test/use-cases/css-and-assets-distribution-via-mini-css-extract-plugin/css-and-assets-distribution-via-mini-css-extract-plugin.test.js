const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('css-and-assets-distribution-via-mini-css-extract-plugin', function() {
    const config = require('./webpack.config.js');

    let stats;
    let entryPoint;
    let asyncChunk;
    let assetWebResource;

    function getResources(node) {
        return node.children.filter(n => n.name === 'resource');
    }

    beforeEach(done => {
        webpack(config, (err, st) => {
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entryPoint = results.root.children.find(n => n.attributes.key === 'entrypoint-app');
            asyncChunk = results.root.children.find(n => n.attributes.key === '0');
            assetWebResource = results.root.children.find(n => n.attributes.key === 'assets-DEV_PSEUDO_HASH');
            done();
        });
    });

    it('should build without failing', () => {
        assert.ok(entryPoint);
        assert.ok(asyncChunk);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    it('should add the stylesheet and the contained assets of the stylesheet as resources to the entry', () => {
        const entryResources = getResources(entryPoint);
        assert.equal(entryResources.length, 4);
        assert.equal(entryResources[0].attributes.type, 'download');
        assert.equal(entryResources[0].attributes.name, 'app.css');
        assert.equal(entryResources[1].attributes.type, 'download');
        assert.equal(entryResources[1].attributes.name, 'app.js');
        assert.equal(path.extname(entryResources[2].attributes.name), '.png');
        assert.equal(path.extname(entryResources[3].attributes.name), '.jpg');
    });

    it('should add the stylesheet and the contained assets of the stylesheet of the async chunk to the async chunk', () => {
        const asyncResources = getResources(asyncChunk);
        assert.equal(asyncResources.length, 4);
        assert.equal(asyncResources[0].attributes.name, '0.css');
        assert.equal(asyncResources[0].attributes.type, 'download');
        assert.equal(asyncResources[1].attributes.name, '0.js');
        assert.equal(asyncResources[1].attributes.type, 'download');
        assert.equal(path.extname(asyncResources[2].attributes.name), '.svg');
        assert.equal(path.extname(asyncResources[3].attributes.name), '.svg');
    });

    it('should create an asset resource containing all "other" assets', () => {
        const assetWebResourceResources = getResources(assetWebResource);
        assert.equal(assetWebResourceResources.length, 4);
        const names = assetWebResourceResources.map(awrr => path.extname(awrr.attributes.name));
        assert.include(names, '.jpg', 'fails to include any jpg files');
        assert.include(names, '.svg', 'fails to include any svg files');
        assert.include(names, '.png', 'fails to include any png files');
    });
});
