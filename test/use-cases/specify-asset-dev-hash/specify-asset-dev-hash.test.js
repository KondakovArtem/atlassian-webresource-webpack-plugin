const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const libraryDescriptor = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'library.xml');
const featureDescriptor = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'main.xml');

describe('specify-asset-dev-hash', function() {
    let config = require('./webpack.config.js');
    let results;
    let libDevNode;
    let featDevNode;

    before(done => {
        webpack(config, (err, stats) => {
            let libXMLFile = fs.readFileSync(libraryDescriptor, 'utf-8');
            let featXMLFile = fs.readFileSync(featureDescriptor, 'utf-8');
            results = parse(libXMLFile);
            libDevNode = results.root.children.find(n => n.attributes.key === 'assets-libDevAssets');
            results = parse(featXMLFile);
            featDevNode = results.root.children.find(n => n.attributes.key === 'assets-featDevAssets');
            done();
        });
    });

    it('uses custom dev asset hashes provided in webpack config', () => {
        assert.exists(libDevNode, 'node called assets-libDevAssets should exist');
        assert.exists(featDevNode, 'node called assets-featDevAssets should exist');
    });
});
