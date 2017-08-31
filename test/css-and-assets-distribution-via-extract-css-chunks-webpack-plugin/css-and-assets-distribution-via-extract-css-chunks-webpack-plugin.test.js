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
    let asyncChunk;
    let resourceEntry;
    let resourceAsyncChunk;

    beforeEach((done) => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entrypoint = results.root.children.find(node => node.attributes.key.startsWith('entrypoint'));
            asyncChunk = results.root.children.find(node => node.attributes.key === "0");
            resourceEntry = entrypoint.children.filter(node => node.name === 'resource');
            resourceAsyncChunk = asyncChunk.children.filter(node => node.name === 'resource');
            done();
        });
    });

    it('should build without failing', () => {
        assert.ok(entrypoint);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
        assert.equal(resourceEntry[0].attributes.type, 'download');
        assert.equal(resourceEntry[0].attributes.name, 'app.js');
    });
    
    it('should add the stylesheet and the contained assets of the stylesheet as resources to the entry', () => {
        assert.ok(entrypoint);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
        assert.equal(resourceEntry.length, 3);
        assert.equal(resourceEntry[0].attributes.name, 'app.js');
        assert.equal(resourceEntry[1].attributes.name, 'app.css');
        assert.equal(path.extname(resourceEntry[2].attributes.name), '.png');
    });

    it('should add the stylesheet and the contained assets of the stylesheet of the async chunk to the async chunk', () => {
        assert.ok(asyncChunk);
        assert.equal(resourceAsyncChunk.length, 3);
        assert.equal(resourceAsyncChunk[0].attributes.name, '0.js');
        assert.equal(resourceAsyncChunk[1].attributes.name, '0.css');
        assert.equal(path.extname(resourceAsyncChunk[2].attributes.name), '.svg');
    });
});
