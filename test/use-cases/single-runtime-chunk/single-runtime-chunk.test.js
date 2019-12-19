const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');
const { setBaseDependencies } = require('../../../src/settings/base-dependencies');
const RUNTIME_WR_KEY = 'common-runtime';
const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-single.xml');

describe('single runtime chunk', function() {
    const baseConfig = require('./webpack.config.js');
    const PLUGIN_KEY = 'com.atlassian.plugin.test';
    const BASE_DEPS = ['base.context:dep1', 'base.context:dep2'];

    function getResources(node) {
        return node.children.filter(n => n.name === 'resource');
    }

    function getDependencies(node) {
        return node.children.filter(n => n.name === 'dependency');
    }

    function runTheTestsFor(config, runtimeName, runtimeWrKey) {
        let wrNodes;
        runtimeWrKey = runtimeWrKey || RUNTIME_WR_KEY;

        before(function(done) {
            setBaseDependencies(BASE_DEPS);

            webpack(config, (err, st) => {
                const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
                const results = parse(xmlFile);
                wrNodes = results.root.children.filter(n => n.name === 'web-resource');
                done();
            });
        });

        it('creates a web-resource for the runtime', function() {
            const wrKeys = wrNodes.map(n => n.attributes.key);
            assert.include(wrKeys, runtimeWrKey, 'dedicated web-resource for the runtime not found');
        });

        it('adds the runtime to the dedicated web-resource for it', function() {
            const runtimeWR = wrNodes.find(n => n.attributes.key === runtimeWrKey);
            const runtimeResources = getResources(runtimeWR);
            const runtimeResourceLocations = runtimeResources.map(n => n.attributes.location);
            assert.equal(runtimeResources.length, 1, 'should only have a single resource');
            assert.equal(runtimeResourceLocations[0], runtimeName, 'should be the runtime');
        });

        it('adds base dependencies to the runtime web-resource', function() {
            const runtimeWR = wrNodes.find(n => n.attributes.key === runtimeWrKey);
            const dependencies = getDependencies(runtimeWR);
            const dependencyNames = dependencies.map(d => d.content);
            assert.includeMembers(dependencyNames, BASE_DEPS, 'runtime should include base deps, but did not');
        });

        it('does not add the runtime to more than one web-resource', function() {
            const allResourceNodes = [].concat.apply([], wrNodes.map(getResources));
            const allResourceLocations = allResourceNodes.map(n => n.attributes.location);
            const runtimeCount = allResourceLocations.filter(loc => loc === runtimeName).length;
            assert.equal(runtimeCount, 1, `${runtimeName} was added to multiple web-resources`);
        });

        it('adds a dependency on the runtime to each entrypoint web-resource', function() {
            const entrypoints = wrNodes.filter(n => n.attributes.key.startsWith('entry'));
            entrypoints.forEach(entry => {
                const wrName = entry.attributes.key;
                const dependencies = getDependencies(entry);
                const dependencyNames = dependencies.map(d => d.content);
                assert.include(
                    dependencyNames,
                    `${PLUGIN_KEY}:${runtimeWrKey}`,
                    `web-resource ${wrName} should depend on runtime, but doesn't`
                );
            });
        });
    }

    describe('when configured as "single"', function() {
        const config = baseConfig('single', webresourceOutput);

        runTheTestsFor(config, 'runtime.js');
    });

    describe('when configured with a static name', function() {
        const name = 'custom';
        const config = baseConfig({ name }, webresourceOutput);

        runTheTestsFor(config, `${name}.js`);
    });

    describe('when configured with a name and custom output format', function() {
        const name = 'fun';
        const config = baseConfig({ name }, webresourceOutput);
        config.output.filename = 'prefixed.[name].suffixed.js';

        runTheTestsFor(config, `prefixed.${name}.suffixed.js`);
    });

    describe('when configured with a web-resource key', function() {
        const name = 'custom';
        const webresourceKey = 'foobar';
        const config = baseConfig({ name }, webresourceOutput, webresourceKey);

        runTheTestsFor(config, `${name}.js`, webresourceKey);
    });

    describe('when not configured', function() {
        const config = baseConfig(false, webresourceOutput);
        let wrNodes;

        before(function(done) {
            webpack(config, (err, st) => {
                const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
                const results = parse(xmlFile);
                wrNodes = results.root.children.filter(n => n.name === 'web-resource');
                done();
            });
        });

        it('does not create a web-resource for the runtime', function() {
            const wrKeys = wrNodes.map(n => n.attributes.key);
            assert.notInclude(
                wrKeys,
                RUNTIME_WR_KEY,
                'dedicated web-resource for the runtime present but should not be'
            );
        });
    });
});
