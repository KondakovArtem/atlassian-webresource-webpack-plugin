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

    it('should run without error', () => {
        assert.ok(wrNodes);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    describe('add transformation for file extensions', () => {
        it('should remove default transformations from web-resources', () => {
            const wrWithGoodConfig = getWebresourceLike('app-one');
            const transformations = getTransformation(wrWithGoodConfig);

            assert.ok(transformations);

            const jsTrans = getTransformationByExtension(transformations, 'js');
            const soyTrans = getTransformationByExtension(transformations, 'soy');
            const lessTrans = getTransformationByExtension(transformations, 'less');

            assert.equal(soyTrans, null);
            assert.equal(lessTrans, null);
            assert.notInclude(jsTrans.children.map(c => c.attributes.key), 'jsI18n');
        });

        it('should add custom transformations to web-resources', () => {
            const wrWithGoodConfig = getWebresourceLike('app-one');
            const transformations = getTransformation(wrWithGoodConfig);

            assert.ok(transformations);

            const jsTrans = getTransformationByExtension(transformations, 'js');
            const xmlTrans = getTransformationByExtension(transformations, 'xml');
            const randomTrans = getTransformationByExtension(transformations, 'random');

            assert.include(jsTrans.children.map(c => c.attributes.key), 'foo');
            assert.include(jsTrans.children.map(c => c.attributes.key), 'bar');

            assert.include(xmlTrans.children.map(c => c.attributes.key), 'bar');

            assert.include(randomTrans.children.map(c => c.attributes.key), 'stuff');
            assert.include(randomTrans.children.map(c => c.attributes.key), 'n stuff');
        });

        it('should not produce duplicated transformations', () => {
            const wrWithGoodConfig = getWebresourceLike('app-one');
            const transformations = getTransformation(wrWithGoodConfig);

            assert.ok(transformations);

            const xmlTrans = getTransformationByExtension(transformations, 'xml');
            const transformationNames = xmlTrans.children.map(c => c.attributes.key);

            assert.equal(transformationNames.length, 1);
        });
    });
});
