const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('asset-loading-via-js', function() {
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
        const publicPathLines = bundleFile.match(/__webpack_require__\.p\s*?=.+?;/g);
        const injectedLine = publicPathLines.find(line => line.includes('download'));

        assert.isNotEmpty(
            injectedLine,
            'an override to the public path helper that uses a WRM-friendly URL should be injected, but was not'
        );
        assert.startsWith(injectedLine, '__webpack_require__.p = AJS.contextPath()');
        assert.endsWith(injectedLine, `/download/resources/com.atlassian.plugin.test:${assets.attributes.key}/";`);
    });
});
