const assert = require('assert');
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('asset-loading-via-js', function () {
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let assets;
    let resources;

    beforeEach((done) => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            assets = results.root.children.find(node => node.attributes.key.startsWith('assets'));
            resources = assets.children.filter(node => node.name === 'resource');
            done();
        });
    });

    it('should create an "asset"-webresource containing the asset', () => {
        assert.ok(assets);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
        assert.equal(resources[0].attributes.type, 'download');
        assert.equal(path.extname(resources[0].attributes.name), '.png');
    });

    it('should add all assets to the "asset"-webresource', () => {
        assert.ok(assets);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
        assert.equal(resources.length, 2);
        assert.equal(resources[0].attributes.type, 'download');
        assert.equal(path.extname(resources[0].attributes.name), '.png');
        assert.equal(resources[1].attributes.type, 'download');
        assert.equal(path.extname(resources[1].attributes.name), '.svg');

    });

    it('should overwrite webpack output path to point to a wrm-resource', () => {
        // setup
        const bundleFile = fs.readFileSync(path.join(targetDir, 'app.js'), 'utf-8');
        const expected = `__webpack_require__.p = WRM.contextPath() + "/download/resources/com.atlassian.plugin.test:${assets.attributes.key}/";`;
        const injectedLine = bundleFile.match(/__webpack_require__\.p = WRM.contextPath.*/)[0];

        assert.equal(expected, injectedLine);
    });
});
