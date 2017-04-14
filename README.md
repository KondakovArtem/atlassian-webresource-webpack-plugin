# Atlassian Web-Resource Webpack Plugin
[![node](https://img.shields.io/badge/node-6.9%2B-brightgreen.svg)]()
[![yarn](https://img.shields.io/badge/yarn-0.23.1-brightgreen.svg)]()

Auto-generates web-resource definitions from your webpacked code, for usage 
in an Atlassian product or plugin.

This is still alpha software; only a few use-case have been accounted for. Improvements will come.

### Basic usage

Add this plugin to your webpack config. For every entry point webpack generates,
an appropriate `<web-resource>` definition will be generated in an XML file for you,
which can then be bundled in to your Atlassian product or plugin, ready to be served
to the browser at product runtime.

Given this webpack config:

```js
module.exports = {
    entry: {
        'atl.general': path.join(FRONTEND_SRC_DIR, 'simple.js')
    },
    plugins: [
        new WrmPlugin(),
    ],
    output: {
        filename: 'bundled.[name].js',
        path: path.resolve(OUTPUT_DIR)
    }
};
```

The output will look something like this:

```xml
<bundles>

        <web-resource key="context-atl.general">
            <transformation extension="js">
                <transformer key="jsI18n"/>
            </transformation>
            <context>atl.general</context>
            <resource name="bundled.atl.general.js" type="download" location="bundled.atl.general.js" />
        </web-resource>

</bundles>
```

## Developing the plugin

### Getting started

#### Prerequisites

* [node](https://nodejs.org/) version should be 6 or above (to check `node -v`)
* [yarn](https://yarnpkg.com/) should be installed globally (`npm install -g yarn@0.23.1`)

## Work to do

This is still alpha software. The following features are planned:

* Support for specifying a different context other than the name of the entry point
* Support for pushing a bundle in to multiple contexts
* Support for adding web-resource conditions
* Webpack HotReload support (requires a server add-on)

