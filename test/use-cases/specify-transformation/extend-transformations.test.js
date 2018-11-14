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
        return wrNodes.find(n => n.attributes.key.indexOf(needle) > -1);
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
            wrNodes = results.root.children;
            done();
        });
    });

    describe('extending transformations', () => {
        let entryJsTrans, lessTrans, svgTrans;

        beforeEach(function() {
            const entrypointTransformations = getTransformation(getWebresourceLike('app-one'));
            const assetTransformations = getTransformation(getWebresourceLike('assets'));

            assert.ok(entrypointTransformations);
            assert.ok(assetTransformations);

            entryJsTrans = getTransformationByExtension(entrypointTransformations, 'js');

            lessTrans = getTransformationByExtension(assetTransformations, 'less');
            svgTrans = getTransformationByExtension(assetTransformations, 'svg');
        });

        it('should include default transformations', () => {
            assert.include(entryJsTrans.children.map(c => c.attributes.key), 'jsI18n');
            assert.include(lessTrans.children.map(c => c.attributes.key), 'lessTransformer');
        });

        it('should contain additional transformers', () => {
            assert.include(entryJsTrans.children.map(c => c.attributes.key), 'custom-transformer');
            assert.include(entryJsTrans.children.map(c => c.attributes.key), 'foo-transformer');

            assert.include(svgTrans.children.map(c => c.attributes.key), 'bar');
        });
    });
});
