const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('specify-transformation', function() {
    const config = require('./webpack.disable-tranformations.config');

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

    describe('disabling transformations', () => {
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

        it('should disable all transformations', () => {
            assert.equal(entryJsTrans, null);
            assert.equal(entryLessTrans, null);
            assert.equal(entrySoyTrans, null);

            assert.equal(jsTrans, null);
            assert.equal(lessTrans, null);
            assert.equal(htmlTrans, null);
            assert.equal(soyTrans, null);
            assert.equal(svgTrans, null);
            assert.equal(txtTrans, null);
        });
    });
});
