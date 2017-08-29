# Atlassian Web-Resource Webpack Plugin
[![node](https://img.shields.io/badge/node-6.9%2B-brightgreen.svg)]()
[![yarn](https://img.shields.io/badge/yarn-0.23.1-brightgreen.svg)]()

Auto-generates web-resource definitions from your webpacked code, for usage
in an Atlassian product or plugin.

## Why?

Atlassian's P2 plugin system was shipped in 2008. At the time, the dependency management
system in P2 -- the Web Resource Manager, or WRM -- was a godsend for managing the growing
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

* A `webresourceKeyMap` to change the web-resource's key to whatever you need it to be, or
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

You can add import statements to your code that will add a `<dependency>` to your generated web-resource:

```js
// in AMD syntax
define(function(require) {
  require('wr-dependency!my.plugin.key:my-webresource');
  console.log('my-webresource will have been loaded synchronously with the page');
});

// in ES6 syntax
import 'wr-dependency!my.plugin.key:my-webresource';

console.log('my-webresource will have been loaded synchronously with the page');
```

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

### `contextMap` (Optional)

A set of key-value pairs that allows you to specify which webpack entry-points
should be present in what web-resource contexts at an Atlassian product runtime.

You can provide either a single web-resource context as a string, or an array of context strings.

### `webresourceKeyMap` (Optional)

Allows you to change the name of the web-resource that is generated for a given webpack entry-point.

This is useful when you expect other plugins will need to depend on your auto-generated web-resources directly, such
as when you refactor an existing feature (and its web-resource) to be generated via Webpack.

### `providedDependencies` (Optional)

An map of objects that let you associate what web-resources house particular external JS dependencies.
The format of an external dependency mapping is as follows:

```js
{
  'dependency-name': {
    dependency: "atlassian.plugin.key:webresource-key",
    import: {
      var: "require('dependency-amd-module-name')",
      amd: "dependency-amd-module-name"
    }
  }
}
```

When your code is compiled through webpack, any occurrence of `dependency-name` found in a module import
statement will be replaced in the webpack output, and an appropriate web-resource `<dependency>` will be
added to the generated web-resource.

## Minimum requirements

This plugin has been built to work with the following versions of the external build tools:

* Webpack 3+
* Node 6+ (at P2 plugin build-time)
* Atlassian Maven Plugin Suite (AMPS) 6.2.11+

## Developing the plugin

### Getting started

#### Prerequisites

* [node](https://nodejs.org/) version should be 6 or above (to check `node -v`)
* [yarn](https://yarnpkg.com/) should be installed globally (`npm install -g yarn@0.23.1`)

## Work to do

This is still beta software. The following features are planned:

* Exporting re-consumable modules within generated web-resources (#10)
* Conversion of `WRM.require` calls in source to async chunk calls (#5)
* Support for adding web-resource conditions (#2)
* Webpack HotReload support (requires a server add-on) (#8)



[101]: https://bitbucket.org/serverecosystem/sao4fed-bundle-the-ui