const assert = require('chai').assert;
const parse = require('xml-parser');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const RUNTIME_WR_KEY = 'common-runtime';
const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-single.xml');

describe('single runtime chunk', function() {
    const baseConfig = require('./webpack.config.js');
    const PLUGIN_KEY = 'com.atlassian.plugin.test';

    function getResources(node) {
        return node.children.filter(n => n.name === 'resource');
    }

    function getDependencies(node) {
        return node.children.filter(n => n.name === 'dependency');
    }

    function runTheTestsFor(config, runtimeName) {
        let wrNodes;

        before(function(done) {
            webpack(config, (err, st) => {
                const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
                const results = parse(xmlFile);
                wrNodes = results.root.children.filter(node => node.name === 'web-resource');
                done();
            });
        });

        it('creates a web-resource for the runtime', function() {
            const wrKeys = wrNodes.map(node => node.attributes.key);
            assert.include(wrKeys, RUNTIME_WR_KEY, 'dedicated web-resource for the runtime not found');
        });

        it('adds the runtime to the dedicated web-resource for it', function() {
            const runtimeWR = wrNodes.find(node => node.attributes.key === RUNTIME_WR_KEY);
            const runtimeResources = getResources(runtimeWR);
            const runtimeResourceLocations = runtimeResources.map(node => node.attributes.location);
            assert.equal(runtimeResources.length, 1, 'should only have a single resource');
            assert.equal(runtimeResourceLocations[0], runtimeName, 'should be the runtime');
        });

        it('adds base WRM dependencies to the runtime web-resource', function() {
            const runtimeWR = wrNodes.find(node => node.attributes.key === RUNTIME_WR_KEY);
            const dependencies = getDependencies(runtimeWR);
            const dependencyNames = dependencies.map(d => d.content);
            assert.includeMembers(
                dependencyNames,
                [
                    'com.atlassian.plugins.atlassian-plugins-webresource-rest:web-resource-manager',
                    'com.atlassian.plugins.atlassian-plugins-webresource-plugin:context-path',
                ],
                'runtime should include deps from the WRM it needs, but did not'
            );
        });

        it('does not add the runtime to more than one web-resource', function() {
            const allResourceNodes = [].concat.apply([], wrNodes.map(getResources));
            const allResourceLocations = allResourceNodes.map(node => node.attributes.location);
            const runtimeCount = allResourceLocations.filter(loc => loc === runtimeName).length;
            assert.equal(runtimeCount, 1, `${runtimeName} was added to multiple web-resources`);
        });

        it('adds a dependency on the runtime to each entrypoint web-resource', function() {
            const entrypoints = wrNodes.filter(node => node.attributes.key.startsWith('entry'));
            entrypoints.forEach(entry => {
                const wrName = entry.attributes.key;
                const dependencies = getDependencies(entry);
                const dependencyNames = dependencies.map(d => d.content);
                assert.include(
                    dependencyNames,
                    `${PLUGIN_KEY}:${RUNTIME_WR_KEY}`,
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

    describe('when not configured', function() {
        const config = baseConfig(false, webresourceOutput);
        let wrNodes;

        before(function(done) {
            webpack(config, (err, st) => {
                const xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
                const results = parse(xmlFile);
                wrNodes = results.root.children.filter(node => node.name === 'web-resource');
                done();
            });
        });

        it('does not create a web-resource for the runtime', function() {
            const wrKeys = wrNodes.map(node => node.attributes.key);
            assert.notInclude(
                wrKeys,
                RUNTIME_WR_KEY,
                'dedicated web-resource for the runtime present but should not be'
            );
        });
    });
});
