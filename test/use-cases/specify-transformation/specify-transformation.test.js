const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('specify-transformation', function() {
    const config = require('./webpack.specify-transformations.config');

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

    it('should run without error', () => {
        assert.ok(wrNodes);
        assert.equal(stats.hasErrors(), false, error);
        assert.equal(stats.hasWarnings(), false);
    });

    describe('add transformation for file extensions', () => {
        let entryJsTrans, entrySoyTrans, entryLessTrans;
        let jsTrans, htmlTrans, lessTrans, soyTrans, svgTrans, txtTrans;

        beforeEach(function() {
            const entrypointTransformations = getTransformation(getWebresourceLike('app-one'));
            const assetTransformations = getTransformation(getWebresourceLike('assets'));

            assert.ok(entrypointTransformations);
            assert.ok(assetTransformations);

            entryJsTrans = getTransformationByExtension(entrypointTransformations, 'js');
            entrySoyTrans = getTransformationByExtension(entrypointTransformations, 'soy');
            entryLessTrans = getTransformationByExtension(entrypointTransformations, 'less');

            jsTrans = getTransformationByExtension(assetTransformations, 'js');
            htmlTrans = getTransformationByExtension(assetTransformations, 'html');
            lessTrans = getTransformationByExtension(assetTransformations, 'less');
            soyTrans = getTransformationByExtension(assetTransformations, 'soy');
            svgTrans = getTransformationByExtension(assetTransformations, 'svg');
            txtTrans = getTransformationByExtension(assetTransformations, 'txt');
        });

        it('should remove default transformations from web-resources', () => {
            assert.equal(entrySoyTrans, null);
            assert.equal(entryLessTrans, null);
            assert.notInclude(entryJsTrans.children.map(c => c.attributes.key), 'jsI18n');

            // the defaults should not end up on the assets web-resource either,
            // since there aren't any assets of those types in the graph.
            assert.equal(jsTrans, null);
            assert.equal(lessTrans, null);
            assert.equal(soyTrans, null);
        });

        it('should add custom transformations to web-resources', () => {
            assert.include(entryJsTrans.children.map(c => c.attributes.key), 'foo');
            assert.include(entryJsTrans.children.map(c => c.attributes.key), 'bar');

            assert.include(txtTrans.children.map(c => c.attributes.key), 'bar');

            assert.include(htmlTrans.children.map(c => c.attributes.key), 'stuff');
            assert.include(htmlTrans.children.map(c => c.attributes.key), 'n stuff');

            assert.equal(svgTrans, null);
        });

        it('should not produce duplicated transformations', () => {
            const transformationNames = txtTrans.children.map(c => c.attributes.key);

            assert.equal(transformationNames.length, 1);
        });
    });
});
