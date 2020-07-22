const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('data-providers', function() {
    let stats;
    let error;
    let entrypoints;

    function getEntrypointByKey(key) {
        return entrypoints.find(entrypoint => entrypoint.attributes.key === key);
    }

    function getDataProviders(entryPointNode) {
        return entryPointNode.children.filter(node => node.name === 'data');
    }

    function getDataProviderByKey(dataProvidersNodes, key) {
        return dataProvidersNodes.find(node => node.attributes.key === key);
    }

    function runWebpack(config, done) {
        const options = typeof config === 'function' ? config() : config;

        webpack(options, (err, st) => {
            error = err;
            stats = st;

            const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
            const results = parse(xmlFile);
            entrypoints = results.root.children.filter(n => n.attributes.key.startsWith('entry'));
            done();
        });
    }

    function runTheTestsFor(config) {
        beforeEach(done => runWebpack(config, done));

        it('should generate one data provider for first entry point', () => {
            const entryPointNode = getEntrypointByKey('entrypoint-my-first-entry-point');

            assert.ok(entryPointNode);

            const dataProviders = getDataProviders(entryPointNode);
            assert.isArray(dataProviders, 'data providers should be an array');
            assert.lengthOf(dataProviders, 1, 'data providers should include one provider');

            const dataProvider = getDataProviderByKey(dataProviders, 'first-data-provider');

            assert.ok(dataProvider);

            assert.include(
                dataProvider.attributes,
                { key: 'first-data-provider', class: 'data.provider.JavaClass' },
                'data provider should match given shape'
            );
        });

        it('should generate two data providers for second entry point', () => {
            const entryPointNode = getEntrypointByKey('entrypoint-my-second-entry-point');

            assert.ok(entryPointNode);

            const dataProviders = getDataProviders(entryPointNode);
            assert.isArray(dataProviders, 'data providers should be an array');
            assert.lengthOf(dataProviders, 2, 'data providers should include two providers');

            const fooDataProvider = getDataProviderByKey(dataProviders, 'foo-data-provider');
            const barDataProvider = getDataProviderByKey(dataProviders, 'bar-data-provider');

            assert.ok(fooDataProvider);
            assert.ok(barDataProvider);

            assert.include(
                fooDataProvider.attributes,
                { key: 'foo-data-provider', class: 'data.provider.FooClass' },
                'foo data provider should match given shape'
            );

            assert.include(
                barDataProvider.attributes,
                { key: 'bar-data-provider', class: 'data.provider.BarClass' },
                'bar data provider should match given shape'
            );
        });

        it('should not generate any data providers for third entry point', () => {
            const entryPointNode = getEntrypointByKey('entrypoint-my-third-entry-point');

            assert.ok(entryPointNode);

            const dataProviders = getDataProviders(entryPointNode);
            assert.lengthOf(dataProviders, 0, "data providers shouldn't be defined");
        });
    }

    describe('using a map', () => {
        const config = require('./webpack.config.with-map.js');
        runTheTestsFor(config);
    });

    describe('using a plain object', () => {
        const config = require('./webpack.config.js');
        runTheTestsFor(config);
    });
});
