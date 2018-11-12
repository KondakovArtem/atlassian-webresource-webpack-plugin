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
        return wrNodes.find(n => n.attributes.key.indexOf(needle) > -1);
    }

    function getCondition(node) {
        return node.children.filter(childNode => childNode.name === 'condition');
    }

    function getConditions(node) {
        return node.children.filter(childNode => childNode.name === 'conditions');
    }

    function getContent(nodes) {
        return nodes.map(n => n.content);
    }

    beforeEach(done => {
        webpack(config, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            wrNodes = results.root.children.filter(n => n.attributes.key.startsWith('entry'));
            done();
        });
    });

    it('should run without error', () => {
        assert.ok(wrNodes);
        assert.equal(stats.hasErrors(), false);
        assert.equal(stats.hasWarnings(), false);
    });

    describe('add conditions to entry-points', () => {
        it('should add nextes conditions as specified in the conditionMap to app-one', () => {
            const wrWithGoodConfig = getWebresourceLike('app-one');
            const conditions = getConditions(wrWithGoodConfig);

            assert.ok(conditions);
            assert.equal(1, conditions.length);

            const condition = conditions[0];
            assert.equal('AND', condition.attributes.type);
            assert.equal(2, condition.children.length);

            assert.equal(
                JSON.stringify(condition),
                `{"name":"conditions","attributes":{"type":"AND"},"children":[{"name":"conditions","attributes":{"type":"OR"},"children":[{"name":"condition","attributes":{"class":"foo.bar.baz","invert":"true"},"children":[{"name":"param","attributes":{"name":"permission"},"children":[],"content":"admin"}],"content":""},{"name":"condition","attributes":{"class":"foo.bar.baz2"},"children":[{"name":"param","attributes":{"name":"permission"},"children":[],"content":"project"}],"content":""}],"content":""},{"name":"condition","attributes":{"class":"foo.bar.baz3"},"children":[{"name":"param","attributes":{"name":"permission"},"children":[],"content":"admin"}],"content":""}],"content":""}`
            );
        });

        it('should add simple condition as specified in condition map to app-two', () => {
            const wrWithGoodConfig = getWebresourceLike('app-two');
            const conditions = getCondition(wrWithGoodConfig);

            assert.ok(conditions);
            assert.equal(1, conditions.length);

            const condition = conditions[0];
            assert.equal('foo.bar.baz', condition.attributes.class);
            assert.equal('true', condition.attributes.invert);

            assert.equal(
                JSON.stringify(condition),
                `{"name":"condition","attributes":{"class":"foo.bar.baz","invert":"true"},"children":[{"name":"param","attributes":{"name":"permission"},"children":[],"content":"admin"}],"content":""}`
            );
        });

        it('should add multiple conditions as specified in condition map to app-three', () => {
            const wrWithGoodConfig = getWebresourceLike('app-three');
            const conditions = getCondition(wrWithGoodConfig);

            assert.ok(conditions);
            assert.equal(2, conditions.length);

            const condition1 = conditions[0];
            assert.equal('foo.bar.baz', condition1.attributes.class);
            assert.equal('true', condition1.attributes.invert);
            const condition2 = conditions[1];
            assert.equal('foo.bar.baz2', condition2.attributes.class);
            assert.equal(undefined, condition2.attributes.invert);

            assert.equal(
                JSON.stringify(conditions),
                `[{"name":"condition","attributes":{"class":"foo.bar.baz","invert":"true"},"children":[{"name":"param","attributes":{"name":"permission"},"children":[],"content":"admin"}],"content":""},{"name":"condition","attributes":{"class":"foo.bar.baz2"},"children":[{"name":"param","attributes":{"name":"permission"},"children":[],"content":"project"}],"content":""}]`
            );
        });
    });
});
