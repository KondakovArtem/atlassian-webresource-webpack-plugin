# Atlassian Web-Resource Webpack Plugin

![node](https://img.shields.io/badge/node-8.12%2B-blue.svg)
![npm](https://img.shields.io/badge/npm-6.9%2B-blue.svg)
![webpack](https://img.shields.io/badge/webpack-4%2B-blue.svg)

Auto-generates web-resource definitions from your webpacked code, for usage
in an Atlassian product or plugin.

## Why?

[Atlassian's P2 plugin system][atlassian-p2] was shipped in 2008. At the time, the dependency management
system in P2 -- [the Web Resource Manager, or WRM][atlassian-wrm] -- was a godsend for managing the growing
complexity of the front-end resources. It offered, amongst other things:

* The ability to specify bundles of related resources, called a "web-resource".
* The ability to specify inter-dependencies of web-resources, so that
* Batching of necessary code in production could be achieved, and
* Source order could be maintained.

Fast-forward to 2017, and front-end development is drastically different than it was back then.
JavaScript module systems and webpack have solved many of the problems the WRM initially set
out to.

Unfortunately, Atlassian's plugin system doesn't speak webpack. Happily, though, we can teach
webpack to speak Atlassian-Plugin. That's what this plugin does.

## What does it do?

When you add this plugin to your webpack configuration, it will generate an XML file
with the various WRM configuration necessary to make your code run in an Atlassian product.

You will be able to write your plugin's front-end code using any JavaScript module system.
This plugin will figure out how to turn all of it in to the correct `<web-resource>` declarations,
along with the appropriate `<dependency>` declarations so that your code ends up loading
in the right order at a product's runtime.

This plugin supports and generates correct WRM output for the following webpack behaviours:

* a `<web-resource>` per webpack entry point
* correct `<web-resource>`s for code-splitting / loading asynchronous chunks
* loading of non-JavaScript resources (via `ExtractTextPlugin` and friends).

## How to use the plugin

### Basic setup

Add this plugin to your webpack config. For every entry point webpack generates,
an appropriate `<web-resource>` definition will be generated in an XML file for you,
which can then be bundled in to your Atlassian product or plugin, ready to be served
to the browser at product runtime.

Given this webpack config:

```js
const WrmPlugin = require('atlassian-webresource-webpack-plugin');

module.exports = {
    entry: {
        'my-feature': path.join(FRONTEND_SRC_DIR, 'simple.js')
    },
    plugins: [
        new WrmPlugin({
            pluginKey: 'my.full.plugin.artifact-id',
            contextMap: {
                'my-feature': ['atl.general']
            },
            xmlDescriptors: path.resolve(OUTPUT_DIR, 'META-INF', 'plugin-descriptors', 'wr-defs.xml')
        }),
    ],
    output: {
        filename: 'bundled.[name].js',
        path: path.resolve(OUTPUT_DIR)
    }
};
```

The output will go to `<OUTPUT_DIR>/META-INF/plugin-descriptors/wr-defs.xml`, and look something like this:

```xml
<bundles>

        <web-resource key="entrypoint-my-feature">
            <transformation extension="js">
                <transformer key="jsI18n"/>
            </transformation>
            <context>atl.general</context>
            <resource name="bundled.my-feature.js" type="download" location="bundled.my-feature.js" />
        </web-resource>

</bundles>
```

#### Consuming the output in your P2 plugin

In your P2 plugin project's `pom.xml` file, add the
`META-INF/plugin-descriptors` directory as a value to an `<Atlassian-Scan-Folders>` tag
in the `<instruction>` section of the AMPS plugin's build configuration.

```xml
<build>
  <plugins>
    <plugin>
      <!-- START of a bunch of stuff that is probably different for your plugin, but is outside
           the scope of this demonstration -->
      <groupId>com.atlassian.maven.plugins</groupId>
      <artifactId>maven-amps-plugin</artifactId>
      <version>6.2.11</version>
      <!-- END differences with your plugin -->
      <configuration>
        <instructions>
          <Atlassian-Scan-Folders>META-INF/plugin-descriptors</Atlassian-Scan-Folders>
        </instructions>
      </configuration>
    </plugin>
  </plugins>
</build>
```

### Demonstration P2 plugin usage

You can see a demonstration P2 plugin using the webpack plugin here: [sao4fed-bundle-the-ui][101]

* Watch this AtlasCamp 2018 talk which uses this plugin amongst others to make your devloop super fast: https://youtu.be/VamdjcJCc0Y
* Watch this AtlasCamp 2017 talk about how to build and integrate your own front-end devtooling on top of P2, which introduced the alpha version of this plugin: https://youtu.be/2yf-TzKerVQ?t=537

## Features

### Code splitting

If you write your code using any of Webpack's code-splitting techniques, such as calling `require.ensure`,
this plugin will automatically generate `<web-resource>` definitions for them, and
automatically translate them in to the appropriate calls to load them asynchronously at an Atlassian
product's runtime.

In other words, there's practically no effort on your part to make your critical path small :)

### Flexible generation of `web-resource` definitions

By default, a generated web-resource will have:

* A key based on the name of your webpack entry-point, and
* Will be included in a `<context>` named after your entry-point.

For example, an entry point named "my-feature" will yield a web-resource like this:

```xml
<web-resource key="entrypoint-my-feature">
  <context>my-feature</context>
  <!-- the resources for your entry-point -->
</web-resource>
```

For new code, this should be enough to get your feature loading in to a place you want it to in your
plugin or product -- assuming the appropriate call on the server-side is made to include your web-resource.

Sometimes, in order to ensure your code loads when it's expected to, you will need to override
the values generated for you. To do this, when defining the `WrmPlugin`'s config, you can provide either:

* A `webresourceKeyMap` to change the web-resource's key or name to whatever you need it to be, or
* A `contextMap` to include the web-resource in any number of web-resource contexts you expect it to load in to.

It's most likely that you'll want to specify additional contexts for a web-resource to load in to. When
all of your web-resources are automatically generated and loaded via contexts, there is no need to know its key. You
would typically provide your own web-resource key when refactoring old code to Webpack, in order to keep
the dependencies working in any pre-existing code.

### Module-mapping to `web-resource`s

If you use a common library or module -- for example, 'jquery' or 'backbone' -- and you know
that this module is provided by a P2 plugin in the product's runtime, you can map your usage
of the module to the `web-resource` that provides it.

All you need to do is declare the appropriate webpack `external` for your module, and add an entry
for the external in the `providedDependencies` configuration of this plugin. When your code is
compiled, this plugin will automatically add an appropriate `web-resource` dependency that
will guarantee your code loads after its dependants, and will prevent your bundle from getting too large.

For details, check the `providedDependencies` section in the configuration section.

### Legacy `web-resource` inclusion

90% of the time, your JavaScript code should be declaring explicit dependencies on other modules.
In the remaining 10% of cases, you may need to lean on the WRM at runtime to ensure your code loads in
the right order. 9% of the time, the module-mapping feature should be enough for you. In the remaining
1%, you may just need to add a `web-resource` dependency to force the ordering.

You can add import statements to your code that will add a `<dependency>` to your generated web-resource.

To include `web-resource`s from exported by _this_ plugin you can use short notation like:

```js
// in AMD syntax
define(function(require) {
  require('wr-dependency!my-webresource');
  console.log('my-webresource will have been loaded synchronously with the page');
});

// in ES6
import 'wr-dependency!my-webresource');

console.log('my-webresource will have been loaded synchronously with the page');
```

To include resources exported by _other_ plugins, provide full plugin key:

```js
// in AMD syntax
define(function(require) {
  require('wr-dependency!com.atlassian.auiplugin:dialog2');
  console.log('webresource will have been loaded synchronously with the page');
});

// in ES6 syntax
import 'wr-dependency!com.atlassian.auiplugin:dialog2';

console.log('webresource will have been loaded synchronously with the page');
```

### Legacy runtime `resource` inclusion

95% of the time, your application's non-JavaScript resources -- CSS, images, templates, etcetera --
are possible to bundle and include via Webpack loaders. Sometimes, though, you will have 
resources that only work during an Atlassian product's runtime -- think things like 
Atlassian Soy templates and a product's LESS files for look-and-feel styles -- and 
it isn't possible to make them work during ahead-of-time compilation.

In these cases, you can add import statements to your code that will add a `<resource>` to your
generated web-resource:

```js
// in AMD syntax
define(function(require) {
  require('wr-resource!my-runtime-styles.css!path/to/the/styles.less');
  require('wr-resource!my-compiled-templates.js!path/to/the/templates.soy');

  console.log('these styles and templates will be transformed to CSS and JS at product runtime.');
});

// in ES6 syntax
import 'wr-resource!my-runtime-styles.css!path/to/the/styles.less';
import 'wr-resource!my-compiled-templates.js!path/to/the/templates.soy';

console.log('these styles and templates will be transformed to CSS and JS at product runtime.');
```

### Legacy runtime test inclusion

If you use the [Atlassian QUnit plugin][104] to write runtime tests, you may be writing tests half-way
between unit tests and black-box integration tests. If your tests expect that certain modules exist,
but those modules are compiled and hidden away via Webpack, those tests won't work well with
your webpacked code.

The preferred approach for migrating to webpack is that you refactor your runtime QUnit tests, either
in to pure unit tests that can run at build-time (e.g., using Jest or Mocha), or
in to pure black-box integration tests that do not need references to any modules or other
implementation details (e.g., using Webdriver).

If these approaches are not achievable in the short term, you can keep your legacy QUnit tests
running by passing them to the plugin in a `__testGlobs__` configuration option. With a small amount of
updates to the test files, they will continue to work long enough for you to rewrite them in a
more proper form. Read the configuration section for detail.

## Configuring the plugin

The Atlassian Web-Resource Webpack Plugin has a number of configuration options.

### `pluginKey` (Required)

The fully-qualified groupId and artifactId of your P2 plugin. Due to the way the WRM works, this
value is necessary to provide in order to support loading of asynchronous chunks, as well as arbirary
(non-JavaScript) resources.

### `xmlDescriptors` (Required)

An absolute filepath to where the generated XML should be output to. This should point to a sub-directory
of the Maven project's `${project.build.outputDirectory}` (which evaluates to `target/classes` in a
standard Maven project).

The sub-directory part of this configuration value needs to be configured in the project's `pom.xml`, as
demonstrated in the basic usage section above.

### `addEntrypointNameAsContext` (Optional)

When set to `true` (the default value), all generated web-resources will be added to
a context with the same name as the entrypoint.

This behaviour can be disabled by setting the value of this option to `false`.

### `addAsyncNameAsContext` (Optional)

When set to `true` (the default value), all generated web-resources for async chunks that have a name (specified via `webpackChunkName` on import) will be added to
a context of the name "async-chunk-<name as specified in webpackChunkName>".

This behaviour can be disabled by setting the value of this option to `false`.

### `contextMap` (Optional)

A set of key-value pairs that allows you to specify which webpack entry-points
should be present in what web-resource contexts at an Atlassian product runtime.

You can provide either a single web-resource context as a string, or an array of context strings.

### `conditionMap` (Optional)

An object specifying what conditions should be applied to a certain entry-point.
Simple example:
```json
{
    "class": "foo.bar"
}
```

will yield:
```xml
<condition class="foo.bar" />
```

Complex nested example with params:
```json
{
    "conditionMap": {
        "type": "AND",
        "conditions": [
            {
                "type": "OR",
                "conditions": [
                    {
                        "class": "foo.bar.baz",
                        "invert": true,
                        "params": [
                            {
                                "attributes": {
                                    "name": "permission"
                                },
                                "value": "admin"
                            }
                        ]
                    },
                    {
                        "class": "foo.bar.baz2",
                        "params": [
                            {
                                "attributes": {
                                    "name": "permission"
                                },
                                "value": "project"
                            }
                        ]
                    }
                ]
            },
            {
                "class": "foo.bar.baz3",
                "params": [
                    {
                        "attributes": {
                            "name": "permission"
                        },
                        "value": "admin"
                    }
                ]
            }
        ]
    }
}
```

will yield:
```xml
<conditions type="AND">
  <conditions type="OR">
    <condition class="foo.bar.baz" invert="true">
      <param name="permission">admin</param>
    </condition>
    <condition class="foo.bar.baz2" >
      <param name="permission">project</param>
    </condition>
  </conditions>
  <condition class="foo.bar.baz3" >
    <param name="permission">admin</param>
  </condition>
</conditions>
```

### `dataProvidersMap` (Optional)

The `dataProvidersMap` option allows configuring the association between entrypoint and a list of data providers.

Data providers can be used to provide a data from the server-side to the frontend, and claimed using `WRM.data.claim` API. To read more about data providers refer to [the official documentation](https://developer.atlassian.com/server/framework/atlassian-sdk/adding-data-providers-to-your-plugin/). 

To associate the entrypoint with list of data providers you can configure the webpack configuration as follow:

```js
{
  entrypoints: {
    'my-first-entry-point': './first-entry-point.js',
    'my-second-entry-point': './first-entry-point.js',
  },

  plugins: [
    WrmPlugin({
        pluginKey: 'my.full.plugin.artifact-id',
        dataProvidersMap: {
          'my-first-entry-point': [
            {
               key: 'my-foo-data-provider',
               class: 'com.example.myplugin.FooDataProvider'
            }   
          ],

          'my-second-entry-point': [
            {
               key: 'my-bar-data-provider',
               class: 'com.example.myplugin.BarDataProvider'
            },

            {
               key: 'my-bizbaz-data-provider',
               class: 'com.example.myplugin.BizBazDataProvider'
            }
          ],
        }
    })
  ]
}
```

will yield:
```xml
<web-resource key="<<key-of-my-first-entry-point>>">
    <resource ... />
    <resource ... />

    <data key="my-foo-data-provider" class="com.example.myplugin.FooDataProvider" />
</web-resource>

<web-resource key="<<key-of-my-first-entry-point>>">
    <resource ... />
    <resource ... />

    <data key="my-bar-data-provider" class="com.example.myplugin.BarDataProvider" />
    <data key="my-bizbaz-data-provider" class="com.example.myplugin.BizBazDataProvider" />
</web-resource>
```

### `transformationMap` (Optional)

An object specifying transformations to be applied to file types.
The default transformations are:

- `*.js` files => `jsI18n`
- `*.soy` files => `soyTransformer`, `jsI18n`
- `*.less` files => `lessTransformer`

Example configuration for custom transformations:

```json
{
    "transformationMap": {
        "js": ["myOwnJsTransformer"],
        "sass": ["myOwnSassTransformer"]
    }
}
```

This would set the following transformations to every generated web-resource:

```xml
<transformation extension="js">
  <transformer key="myOwnJsTransformer"/>
</transformation>
<transformation extension="sass">
  <transformer key="myOwnSassTransformer"/>
</transformation>
```

If you wish to extend the default transformations you can use the build-in `extendTransformations` function provided by the plugin.
It will merge the default transformations with your custom config:

```js
const WrmPlugin = require('atlassian-webresource-webpack-plugin');

new WrmPlugin({
    pluginKey: 'my.full.plugin.artifact-id',
    transformationMap: WrmPlugin.extendTransformations({
        js: ['myOwnJsTransformer'],
        sass: ['myOwnSassTransformer'],
    }),
});
```

You can also completely disable the transformations by passing `false` value to the plugin configuration:

```json
{
  "transformationMap": false
}
```

### `webresourceKeyMap` (Optional)

Allows you to change the name of the web-resource that is generated for a given webpack entry-point.

This is useful when you expect other plugins will need to depend on your auto-generated web-resources directly, such
as when you refactor an existing feature (and its web-resource) to be generated via Webpack.

This parameter can take either `string` or `object` with properties `key`, `name` and `state` which corresponds to
`key`, `name` and `state` attributes of `web-resource` XML element. `name` and `state` properties are optional.

Mapping as follows:
```json
{
  "webresourceKeyMap": {
    "firstWebResource": "first-web-resource",
    "secondWebResource": {
      "key": "second-web-resource",
      "name": "Second WebResource",
      "state": "disabled"
    }
  }
}
```

will result in the following web-resources:
```xml
<web-resource key="first-web-resource" name="" state="enabled">
  <!-- your resources definitions -->
</web-resource>
<web-resource key="second-web-resource" name="Second WebResource" state="disabled">
  <!-- your resources definitions -->
</web-resource>
```

### `providedDependencies` (Optional)

A map of objects that let you associate what web-resources house particular external JS dependencies.

The format of an external dependency mapping is as follows:

```json
{
  "dependency-name": {
    "dependency": "atlassian.plugin.key:webresource-key",
    "import": externals
  }
}
```

In this example, `externals` is a JSON object following the
[Webpack externals format][webpack-externalobjects].

When your code is compiled through webpack, any occurrence of `dependency-name` found in a module import
statement will be replaced in the webpack output, and an appropriate web-resource `<dependency>` will be
added to the generated web-resource.


### `wrmManifestPath` (Optional)

A path to a WRM manifest file where the plugin will store a map of objects.
Under the `providedDependencies` property is a map of dependencies, including the generated web-resource keys.
This map is the exact same format that is accepted with the `providedDependencies` option above,
so one can use this map as a source for `providedDependencies` in another build:

```json
{
  "providedDependencies": {
    "dependency-name": {
      "dependency": "atlassian.plugin.key:webresource-key",
      "import": {
        "var": "require('dependency-amd-module-name')",
        "amd": "dependency-amd-module-name"
      }
    }
  }
}
```

#### Notes and limitations

* Both `output.library` and `output.libraryTarget` must be set for the WRM manifest file to be created.
* `output.library` must not contain \[chunk\] or \[hash\], however \[name\] is allowed
* `output.libraryTarget` must be set to `amd`
* More properties might be added to the WRM manifest file in future

#### Example configuration

```json
{
    "output": {
        "library": "[name]",
        "libraryTarget": "amd"
    }
}
```

### `resourceParamMap` (Optional)

An object specifying additional parameters (`<param/>`) for `resource`s.

To specify for example content-types the server should respond with for a certain assets file-type (e.g. images/fonts):

```json
{
  "resourceParamMap": {
    "svg": [{
      "name": "content-type",
      "value": "image/svg+xml"
    }]
  }
}
```

Setting specific content-types may be required by certain Atlassian products depending on the file-type to load.
*Contains content-type for svg as "image/svg+xml" by default*

### `locationPrefix` (Optional)

Adds given prefix value to `location` attribute of `resource` node.
Use this option when your webpack output is placed in a subdirectory of the plugin's ultimate root folder.

### `devAssetsHash` (Optional)
Uses provided value (instead of DEV_PSEUDO_HASH) in the webresource name that contains all of the assets needed in development mode.

### `watch` and `watchPrepare` (Optional)
Activates "watch-mode". This must be run in conjuction with a webpack-dev-server.
#### `watchPrepare`
Creates "proxy"-Resources and references them in the XML-descriptor. These proxy-resources will redirect to a webpack-dev-server that has to be run too.
In order for this to work properly, ensure that the webpack-config "options.output.publicPath" points to the webpack-dev-server - including its port. (e.g. http://localhost:9000)
#### `watch` (Optional)
Use when running the process with a webpack-dev-server.

### `useDocumentWriteInWatchMode` (Optional)
When set to `true`, the generated watch mode modules will add the script tags to the document synchronously with `document.write` while the document is loading, rather than always relying on asynchronously appended script tags (default behaviour).

This is useful when bundles are expected to be available on the page early, e.g. when code in a template relies on javascript to be loaded blockingly.

### `noWRM` (Optional)
Will not add any WRM-specifics to the webpack-runtime or try to redirect async-chunk requests while still handling requests to `wr-dependency` and `wr-resource`. 
This can be useful to develop frontend outside of a running product that provides the WRM functionality.

### `singleRuntimeWebResourceKey` (Optional)
Set a specific web-resource key for the Webpack runtime when using the Webpack option `optimization.runtimeChunk` to `single` (see [runtimeChunk documentation](https://webpack.js.org/configuration/optimization/#optimizationruntimechunk)). Default is `common-runtime`.

### `verbose` (Optional)
Indicate verbosity of log output. Default is `false`.

### `standalone` (Optional) (Experimental)
**Do not use this** 
Builds standalone web-resources, no transformations and base-dependencies will be applied.
No non-entry-chunks are supported.
*Experimental - may change or be removed again at any time* 

## Deprecated configuration

### `assetContentTypes` (DEPRECATED) (Optional)

> This option is **deprecated** and will be removed in a future version. Please use `resourceParamMap` instead.

An object specifying content-types the server should respond with for a certain assets file-type (e.g. images/fonts):

```json
{
  "assetContentTypes": {
    "svg": "image/svg+xml"
  }
}
```

This may be required by certain Atlassian products depending on the file-type to load.
*Contains content-type for svg as "image/svg+xml" by default*

### `__testGlobs__` (Optional) (Deprecated)

When provided, the Webpack compilation will generate `<resource type="qunit"/>` entries for each test file
the glob specifies. It will also cause Webpack to generate web-resources for both the compiled output *and*
raw source modules.

The source modules will be available in a web-resource key beginning with `__test__`, followed by the name
of the entrypoint they were discovered through. For instance, if your entrypoint name is `my-feature`,
and your plugin key is `com.example.myplugin`, the web-resource key for `my-feature`'s source modules will be
`com.example.myplugin:__test__entrypoint-my-feature`.

Because the web-resource name with testable source files is auto-generated, the QUnit test files will
need to be updated to point at the appropriate web-resource key,
so that any modules the test expects to be present will be loaded via the WRM at runtime.

This configuration option is deprecated and will be removed in a 1.0 release of this plugin. The option
exists to give developers time to refactor and rewrite their QUnit tests as build-time tests; either
as pure unit tests (e.g., via Jest or Mocha) or pure black-box integration tests (e.g., via Webdriver).

## Minimum requirements

This plugin has been built to work with the following versions of the external build tools:

* Webpack 4+
* Node 6+ (at P2 plugin build-time)
* [Atlassian Maven Plugin Suite (AMPS)][atlassian-amps] 6.2.11+
* [Atlassian Web Resource Manager (WRM)][atlassian-wrm] 3.6+


[101]: https://bitbucket.org/serverecosystem/sao4fed-bundle-the-ui
[104]: https://bitbucket.org/atlassian/atlassian-qunit-plugin
[atlassian-sdk]: https://developer.atlassian.com/server/framework/atlassian-sdk
[atlassian-amps]: https://developer.atlassian.com/server/framework/atlassian-sdk/working-with-maven/#using-the-amps-maven-plugin-directly
[atlassian-p2]: https://bitbucket.org/atlassian/atlassian-plugins
[atlassian-wrm]: https://bitbucket.org/atlassian/atlassian-plugins-webresource
[webpack]: https://webpack.js.org/
[webpack-externalobjects]: https://webpack.js.org/configuration/externals/#object
