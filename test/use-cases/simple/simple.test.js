const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('simple', function() {
    let config = require('./webpack.config.js');

    it('compiles an xml file', done => {
        webpack(config, (err, stats) => {
            if (err) {
                throw err;
            }
            assert.equal(stats.hasErrors(), false);
            assert.equal(stats.hasWarnings(), false);
            assert.equal(fs.existsSync(webresourceOutput), true);
            done();
        });
    });

    describe('a web-resource for a webpack entry point', function() {
        let results, contextEntryNode;

        before(done => {
            webpack(config, (err, stats) => {
                let xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
                results = parse(xmlFile);
                contextEntryNode = results.root.children.find(n => n.attributes.key === 'entrypoint-simple-entry');
                done();
            });
        });

        it('exists', () => {
            assert.typeOf(contextEntryNode, 'object');
        });

        it('has an i18n transformation', () => {
            let node = contextEntryNode.children[0];
            assert.nestedPropertyVal(node, 'name', 'transformation');
            assert.nestedPropertyVal(node, 'attributes.extension', 'js');
            assert.nestedPropertyVal(node, 'children[0].name', 'transformer');
            assert.nestedPropertyVal(node, 'children[0].attributes.key', 'jsI18n');
        });

        // @deprecated
        it('has a context named after the entry point', () => {
            let node = contextEntryNode.children
                .filter(n => n.name === 'context')
                .find(n => n.content === 'simple-entry');
            assert.nestedPropertyVal(node, 'name', 'context');
            assert.nestedPropertyVal(node, 'content', 'simple-entry');
        });

        it('has a resource that references the generated bundle file', () => {
            let node = contextEntryNode.children.find(n => n.name === 'resource');
            assert.nestedPropertyVal(node, 'name', 'resource');
            assert.nestedPropertyVal(node, 'attributes.type', 'download');
            assert.nestedPropertyVal(node, 'attributes.name', 'simple-entry.js');
            assert.nestedPropertyVal(node, 'attributes.location', 'simple-entry.js');
        });
    });

    describe('a web-resource for the (web-resource) deps of an entry point', function() {
        let results, contextDepsNode;

        before(done => {
            webpack(config, (err, stats) => {
                let xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
                results = parse(xmlFile);
                contextDepsNode = results.root.children.find(n => n.attributes.key === 'entrypoint-simple-entry');
                done();
            });
        });

        it('exists', () => {
            assert.typeOf(contextDepsNode, 'object');
        });
    });
});
