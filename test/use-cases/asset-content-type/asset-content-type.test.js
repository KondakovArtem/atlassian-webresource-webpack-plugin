const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('asset-content-type', () => {
    const config = require('./webpack.config.js');

    let stats;
    let assets;
    let resources;

    beforeEach(done => {
        webpack(config, (err, st) => {
            stats = st;
            if (stats.hasErrors()) {
                assert.fail(
                    'Webpack stats contains errors: ' + JSON.stringify(stats.toJson({ errorDetails: true }), null, 4)
                );
            }

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
    });

    it('should add all assets to the "asset"-webresource', () => {
        assert.sameDeepMembers(resources, [
            {
                name: 'resource',
                attributes: { type: 'download', name: 'ice.png', location: 'ice.png' },
                children: [],
            },
            {
                name: 'resource',
                attributes: { type: 'download', name: 'rect.svg', location: 'rect.svg' },
                children: [
                    {
                        name: 'param',
                        attributes: { name: 'content-type', value: 'image/svg+xml' },
                        children: [],
                    },
                ],
                content: '',
            },
        ]);
    });
});
