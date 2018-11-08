const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('specify-transformation', function() {
    const config = require('./webpack.extend-tranformations.config');

    let stats;
    let error;
    let wrNodes;

    function getWebresourceLike(needle) {
        return wrNodes.find(node => node.attributes.key.indexOf(needle) > -1);
    }

    function getTransformation(node) {
        return node.children.filter(childNode => childNode.name === 'transformation');
    }

    function getTransformationByExtension(transformations, extname) {
        return transformations.filter(transformation => transformation.attributes.extension === extname)[0];
    }

    beforeEach(done => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            wrNodes = results.root.children.filter(node => node.attributes.key.startsWith('entry'));
            done();
        });
    });

    describe('extending transformations', () => {
        it('should extends default transformations', () => {
            const wrWithGoodConfig = getWebresourceLike('app-one');
            const transformations = getTransformation(wrWithGoodConfig);

            assert.ok(transformations);

            const jsTrans = getTransformationByExtension(transformations, 'js');
            const svgTrans = getTransformationByExtension(transformations, 'svg');

            assert.include(jsTrans.children.map(c => c.attributes.key), 'custom-transformer');
            assert.include(jsTrans.children.map(c => c.attributes.key), 'foo-transformer');
            assert.include(jsTrans.children.map(c => c.attributes.key), 'jsI18n');

            assert.include(svgTrans.children.map(c => c.attributes.key), 'bar');
        });
    });
});
