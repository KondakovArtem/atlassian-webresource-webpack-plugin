const path = require('path');
const merge = require('webpack-merge');
const WrmPlugin = require('../../../src/WrmPlugin');
const FRONTEND_SRC_DIR = path.resolve(__dirname, 'src');
const OUTPUT_DIR = path.resolve(__dirname, 'target');

const getLibraryWrmConfig = () => {
    return {
        webresourceKeyMap: {
            library: 'libResource',
        },
        devAssetsHash: 'libDevAssets',
    };
};

const getFeatureWrmConfig = () => {
    return {
        webresourceKeyMap: {
            feature: 'featResource',
        },
        devAssetsHash: 'featDevAssets',
    };
};

const webResourcePlugin = isLibrary => {
    const baseWrmConfig = {
        pluginKey: 'com.atlassian.plugin.test',
        xmlDescriptors: path.join(
            __dirname,
            'target',
            'META-INF',
            'plugin-descriptor',
            isLibrary ? 'library.xml' : 'main.xml'
        ),
    };

    return new WrmPlugin(merge(baseWrmConfig, isLibrary ? getLibraryWrmConfig() : getFeatureWrmConfig()));
};

const webpackConfigForLibrary = {
    name: 'Library',
    context: __dirname,
    entry: {
        library: path.join(FRONTEND_SRC_DIR, 'library.js'),
    },
    output: {
        library: '[name]',
        libraryTarget: 'amd',
        filename: '[name].js',
        path: path.resolve(OUTPUT_DIR),
    },
    plugins: [webResourcePlugin(true)],
};

const webpackConfigForFeature = {
    name: 'Feature',
    context: __dirname,
    mode: 'development',
    entry: {
        feature: path.join(FRONTEND_SRC_DIR, 'feature.js'),
    },
    output: {
        library: '',
        libraryTarget: 'var',
        filename: '[name].js',
        path: path.resolve(OUTPUT_DIR),
    },
    plugins: [webResourcePlugin(false)],
};

module.exports = [webpackConfigForLibrary, webpackConfigForFeature];
