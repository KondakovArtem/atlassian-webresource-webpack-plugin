## 0.2.0 (July 19, 2017)

Thanks to [@timse2](https://bitbucket.org/timse2), the plugin has been re-implemented in order to introduce a bunch of sweet behaviours!

* Can specify multiple WRM contexts for an entrypoint (closes #1)
* Can inject conditions in to generated web-resources (addresses #2)
* Support for asynchronous chunks! (addresses #5)
* Support for bundling non-JavaScript resources like CSS and images! (closes #7)
* An entrypoint's web-resource dependencies are injected in to the same web-resource instead of a separate one (fixes #3)
* Reworked support for importing web-resource dependencies; they should now be declared in JavaScript with `wr-dependency!` prefix. (addresses #13)
* Reworked support for external dependencies; the correct JavaScript value and WRM dependency will be injected depending on the webpack output config (fixes #6)

The new configuration options for the plugin are as follows:

* Mapping an entry point to a context is done through the `contextMap` option.
  The format is as follows:

  ```js
  new WrmPlugin({
    contextMap: {
      "entrypoint-name": ["context-A", "context-B"]
    }
  });
  ```

* Mappings of web-resource keys to external JS dependencies is provided via the `providededDependencies` option.
  It accepts an array of javascript objects describing the dependency mapping.
  The format of these external dependency mappings has changed, too.

  The new external dependency format is plain JavaScript instead of JSON. This allows us a bit more flexibility in the future.
  The basic format is as follows:

  ```js
  {
    dependencyKey: {
      dependency: "atlassian.plugin.key:webresource-key",
      import: {
        var: "require('dependency-amd-module-name')",
        amd: "dependency-amd-module-name"
      }
    }
  }
  ```

This re-implementation of the plugin necessitates some changes to how it is configured:

* All options for the plugin are provided in a flat JavaScript object structure; no more `options` key in the options any more.
* The Atlassian plugin's full plugin key *must be provided* to this webpack plugin now via the `pluginKey` option.
* The `xmlDescriptors` configuration option must be an *absolute filepath*.

Some behaviours have been removed:

* The ability to provide an external `dependenciesFile` option is gone.
* You can no longer specify web-resource dependencies that will be added to every automatically-generated web-resource.
    * The `wrmDependencies` configuration option is gone.
    * The `*` mapping in the external dependencies file is gone.
  Instead, web-resource dependencies should be declared in each entry-point.

Why did the global dependencies behaviour go away (aka: why did we address #13)? Simple: it improves your application's correctness.

The web-resource manager is lenient since dependencies are loaded at runtime. Though useful, this behaviour leads to developers making assumptions
about what code will be available to them at runtime, and crucial dependencies are often omitted from their plugin xml.
The net effect of this would be that a developer's code would mysteriously stop working. Any number of things could cause this, including:

* a product's web-resource descriptions changed
* a page started pulling in different combinations of web-resources or contexts
* a resource was removed from the superbatch
* the WRM starts to load resources in a different order

To mitigate the risk of these changes breaking your code, all dependencies for a given part of your app should be discoverable by the compiler.
By knowing the dependencies ahead of time, it's possible to make a guarantee that your application code will work no matter where or when it is loaded.


## 0.1.2 (11 July, 2017)

* Added automated testing via Bitbucket Pipelines
* Code cleanup and simplification ([@timse2](https://bitbucket.org/timse2) in [PR #1](https://bitbucket.org/atlassianlabs/atlassian-webresource-webpack-plugin/pull-requests/1))

## 0.1.1 (May 1, 2017)

* First release on npmjs.com

## 0.1.0 (April 14, 2017)

* Initial public release