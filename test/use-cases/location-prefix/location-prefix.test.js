const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('location-prefix', function() {
    let config = require('./webpack.config.js');
    let results, contextEntryNode;

    before(done => {
        webpack(config, (err, stats) => {
            let xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            results = parse(xmlFile);
            contextEntryNode = results.root.children.find(n => n.attributes.key === 'entrypoint-simple-entry');
            done();
        });
    });

    it('add prefix to location value', () => {
        let node = contextEntryNode.children.find(n => n.name === 'resource');
        assert.propertyVal(node.attributes, 'location', 'js/simple-entry.js');
    });
});
