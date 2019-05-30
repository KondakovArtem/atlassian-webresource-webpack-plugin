const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('specify-explicit-context (with no auto-generated values)', function() {
    const config = require('./webpack.config.js');

    let stats;
    let error;
    let wrNodes;

    function getWebresourceLike(needle) {
        return wrNodes.find(n => n.attributes.key.indexOf(needle) > -1);
    }

    function getContexts(node) {
        return node.children.filter(n => n.name === 'context');
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

    it('should add additional contexts as specified in the contextMap', () => {
        const wrWithGoodConfig = getWebresourceLike('good-newcontexts');
        const contexts = getContent(getContexts(wrWithGoodConfig));
        assert.ok(contexts);
        assert.include(contexts, 'some:weird:context');
        assert.include(contexts, 'foo.bar');
        assert.notInclude(contexts, 'app-good-newcontexts');
    });

    it('should add the entrypoint name as a context when there is no contextMap config for it', () => {
        const wrWithImplicitConfig = getWebresourceLike('good-implicit');
        const contexts = getContent(getContexts(wrWithImplicitConfig));
        assert.ok(contexts);
        assert.equal(contexts.length, 0);
    });

    it('should ignore non-array configuration values gracefully', () => {
        const wrWithBadConfig = getWebresourceLike('bad-objectlike');
        const contexts = getContent(getContexts(wrWithBadConfig));
        assert.ok(contexts);
        assert.equal(contexts.length, 0);
    });

    it('should ignore falsy configuration values gracefully', () => {
        const wrWithBadConfig = getWebresourceLike('bad-falsy');
        const contexts = getContent(getContexts(wrWithBadConfig));
        assert.ok(contexts);
        assert.equal(contexts.length, 0);
    });

    it('should ignore non-string context names gracefully', () => {
        const wrWithBadValues = getWebresourceLike('bad-emptyvalues');
        const contexts = getContent(getContexts(wrWithBadValues));
        assert.ok(contexts);
        assert.include(contexts, 'foo.bar');
        assert.notInclude(contexts, 'app-bad-emptyvalues');
    });
});
