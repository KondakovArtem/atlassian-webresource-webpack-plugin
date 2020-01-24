const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('qunit-test-wrm-web-resource', function() {
    this.timeout(10000);
    const config = require('./webpack.config.js');

    let stats;
    let entry1;
    let entry2;
    let testEntry1;
    let testEntry2;
    let qunitResources;

    function getDependencies(node) {
        return node.children.filter(n => n.name === 'dependency');
    }

    function getResources(node) {
        return node.children.filter(n => n.name === 'resource');
    }

    function getContent(nodes) {
        return nodes.map(n => n.content);
    }

    function getName(nodes) {
        return nodes.map(n => n.attributes.name);
    }

    before(done => {
        webpack(config, (err, st) => {
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            [entry1, entry2] = results.root.children.filter(
                n => n.attributes.key && n.attributes.key.startsWith('entrypoint')
            );
            [testEntry1, testEntry2] = results.root.children.filter(
                n => n.attributes.key && n.attributes.key.startsWith('__test__entrypoint')
            );
            qunitResources = results.root.children.filter(n => n.attributes.type === 'qunit');
            done();
        });
    });

    it('should create an xml file without errors', () => {
        // check
        assert.equal(stats.hasErrors(), false, 'should not have errors');
        assert.equal(stats.hasWarnings(), false, 'should not have warnings');
    });

    it('should create a "normal" and a "test" web-resource per entry', () => {
        // check
        assert.ok(entry1, 'entry1 does not exist');
        assert.ok(entry2, 'entry2 does not exist');
        assert.ok(testEntry1, 'testEntry1 does not exist');
        assert.ok(testEntry2, 'testEntry2 does not exist');
    });

    it('should create qunit-resource entries per found test file - as specified by the glob', () => {
        // setup
        const [barResource, fooResource] = getName(qunitResources);

        // check
        assert.equal(qunitResources.length, 2, 'qunit resources not found');
        assert.equal(
            barResource,
            'test/use-cases/qunit-test-wrm-web-resource/src/bar-dep_test.js',
            'expected to find qunit resources for bar-dep.js'
        );
        assert.equal(
            fooResource,
            'test/use-cases/qunit-test-wrm-web-resource/src/foo-dep_test.js',
            'expected to find qunit resources for foo-dep.js'
        );
    });

    describe('test web-resources', () => {
        it('should contain dependencies as found in their respective entries', () => {
            // setup
            const deps1 = getContent(getDependencies(testEntry1));
            const deps2 = getContent(getDependencies(testEntry2));

            // check
            assert.include(deps1, 'some.weird:web-resource');
            assert.include(deps1, 'foo-bar:baz');
            assert.include(deps2, 'some.weird:web-resource');
        });

        it('should contain a mock-require as the first file dependency per entry', () => {
            // setup
            const actualFirstResource1 = getName([getResources(testEntry1)[0]])[0];
            const actualFirstResource2 = getName([getResources(testEntry2)[0]])[0];
            const expectedFirstResource = 'qunit-require-shim-DEV_PSEUDO_HASH.js';

            // check
            assert.equal(
                actualFirstResource1,
                expectedFirstResource,
                'unexpected first file in test entry 1 - expected require mock'
            );
            assert.equal(
                actualFirstResource2,
                expectedFirstResource,
                'unexpected first file in test entry 2 - expected require mock'
            );
        });

        it('should not contain the files from another entry', () => {
            // setup
            const actualFirstResource1 = getName(getResources(testEntry1));
            const actualFirstResource2 = getName(getResources(testEntry2));
            const expectedOnlyInEntry1 = 'test/use-cases/qunit-test-wrm-web-resource/src/app.js';
            const expectedOnlyInEntry2 = 'test/use-cases/qunit-test-wrm-web-resource/src/app.2.js';

            // check
            assert.include(actualFirstResource1, expectedOnlyInEntry1, 'missing resource in first entry');
            assert.include(actualFirstResource2, expectedOnlyInEntry2, 'missing resource in second entry');
            assert.notInclude(actualFirstResource1, expectedOnlyInEntry2, 'unexpected resource in second entry');
            assert.notInclude(actualFirstResource2, expectedOnlyInEntry1, 'unexpected resource in second entry');
        });

        it('should only contain the files contained in the respective entrypoint', () => {
            // setup
            const actualResources1 = getName(getResources(testEntry1));
            const actualResources2 = getName(getResources(testEntry2));
            const expectedResources1 = [
                'qunit-require-shim-DEV_PSEUDO_HASH.js',
                'ultimate/name/at/runtime.js',
                'test/use-cases/qunit-test-wrm-web-resource/src/bar-dep.js',
                'ultimate/name/at/runtime.css',
                'test/use-cases/qunit-test-wrm-web-resource/src/foo-dep.js',
                'test/use-cases/qunit-test-wrm-web-resource/src/app.js',
                'very_async_less.less',
                'test/use-cases/qunit-test-wrm-web-resource/src/foo-async.js',
            ];
            const expectedResources2 = [
                'qunit-require-shim-DEV_PSEUDO_HASH.js',
                'ultimate/name/at/runtime.js',
                'test/use-cases/qunit-test-wrm-web-resource/src/bar-dep.js',
                'test/use-cases/qunit-test-wrm-web-resource/src/app.2.js',
            ];

            // check
            assert.deepEqual(actualResources1, expectedResources1, 'unexpected files in test resources for entry 1');
            assert.deepEqual(actualResources2, expectedResources2, 'unexpected files in test resources for entry 2');
        });
    });
});
