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

    describe('disabling transformations', () => {
        it('should disable all transformations', () => {
            const wrWithGoodConfig = getWebresourceLike('app-one');
            const transformations = getTransformation(wrWithGoodConfig);

            assert.ok(transformations);

            const jsTrans = getTransformationByExtension(transformations, 'js');
            const lessTrans = getTransformationByExtension(transformations, 'less');
            const soyTrans = getTransformationByExtension(transformations, 'soy');

            assert.equal(jsTrans, null);
            assert.equal(lessTrans, null);
            assert.equal(soyTrans, null);
        });
    });
});
