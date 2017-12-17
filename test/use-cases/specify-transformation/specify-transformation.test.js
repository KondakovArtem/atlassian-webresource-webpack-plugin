const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('specify-conditions', function() {
    const config = require('./webpack.config.js');

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
        it('should maintain the default transformations for web-resources', () => {
            const wrWithGoodConfig = getWebresourceLike('app-one');
            const transformations = getTransformation(wrWithGoodConfig);

            assert.ok(transformations);

            const jsTrans = getTransformationByExtension(transformations, 'js');
            const soyTrans = getTransformationByExtension(transformations, 'soy');
            const lessTrans = getTransformationByExtension(transformations, 'less');

            assert.include(jsTrans.children.map(c => c.attributes.key), 'jsI18n');

            assert.include(soyTrans.children.map(c => c.attributes.key), 'jsI18n');
            assert.include(soyTrans.children.map(c => c.attributes.key), 'soyTransformer');

            assert.include(lessTrans.children.map(c => c.attributes.key), 'lessTransformer');
        });

        it('should add additional transformations to web-resources', () => {
            const wrWithGoodConfig = getWebresourceLike('app-one');
            const transformations = getTransformation(wrWithGoodConfig);

            assert.ok(transformations);

            const jsTrans = getTransformationByExtension(transformations, 'js');
            const fooTrans = getTransformationByExtension(transformations, 'foo');
            const randomTrans = getTransformationByExtension(transformations, 'random');

            assert.include(jsTrans.children.map(c => c.attributes.key), 'foo');
            assert.include(jsTrans.children.map(c => c.attributes.key), 'bar');

            assert.include(fooTrans.children.map(c => c.attributes.key), 'bar');

            assert.include(randomTrans.children.map(c => c.attributes.key), 'stuff');
            assert.include(randomTrans.children.map(c => c.attributes.key), 'n stuff');
        });
    });
});
