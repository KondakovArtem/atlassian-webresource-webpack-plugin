## 0.4.2 (September 11, 2017)

* bugfix: Common assets extracted via `CommonsChunkPlugin` are correctly de-duplicated across generated web-resource definitions (fixes #20). ([@timse2](https://bitbucket.org/timse2) in [PR #21](https://bitbucket.org/atlassianlabs/atlassian-webresource-webpack-plugin/pull-requests/21)).

## 0.4.1 (September 6, 2017)

* bugfix: Allows `NamedModulesPlugin` to work correctly (fixes #22). ([@timse2](https://bitbucket.org/timse2) in [PR #20](https://bitbucket.org/atlassianlabs/atlassian-webresource-webpack-plugin/pull-requests/20)).

## 0.4.0 (September 5, 2017)

* feature: Legacy QUnit tests that only run during an Atlassian product's runtime are now supported through a (deprecated) configuration option (fixes #12). ([@timse2](https://bitbucket.org/timse2) in [PR #12](https://bitbucket.org/atlassianlabs/atlassian-webresource-webpack-plugin/pull-requests/12)).

The QUnit test bridge is a deprecated feature that will be removed in the v1.0 of this plugin. It is included to provide a graceful rollover period
for developers wanting to compile their front-end and keep the assurance of some existing tests around while they refactor to a build-time testing solution.

See the README for how to configure and use this behaviour.

## 0.3.0 (September 1, 2017)

* feature: Can load legacy resources with side-effects from an existing Atlassian Plugin's XML using the `wrm-resource!` loader prefix (addresses #19). (([@timse2](https://bitbucket.org/timse2) and [@chrisdarroch](https://bitbucket.org/chrisdarroch) in [PR #16](https://bitbucket.org/atlassianlabs/atlassian-webresource-webpack-plugin/pull-requests/16)).

This feature affords developers a rollover period where they can reference resources from their existing plugin's code in their to-be-compiled code.

By using `wrm-resource!` and `wrm-dependency!`, developers will be able to move the canonical dependency graph of their front-end application
in to the JavaScript layer. From here, they can be considered a code smell to be refactored away over time by incrementally adopting more
plugins and capabilities for ahead-of-time compilation via webpack.

## 0.2.2 (August 31, 2017)

* feature: Can provide a plain javascript object for the `providedDependencies` option.
* feature: Can explicity name the generated web-resources via the `webresourceKeyMap` config option (fixes #9). ([@chrisdarroch](https://bitbucket.org/chrisdarroch) in [PR #15](https://bitbucket.org/atlassianlabs/atlassian-webresource-webpack-plugin/pull-requests/15)).
* bugfix: Allow to compile directly in to `target/classes` without warning user (fixes #16) ([@timse2](https://bitbucket.org/timse2) in [PR #18](https://bitbucket.org/atlassianlabs/atlassian-webresource-webpack-plugin/pull-requests/18)).
* bugfix: Only add assets that belong to a chunk to the chunk (fixes #15, #17). ([@timse2](https://bitbucket.org/timse2) in [PR #19](https://bitbucket.org/atlassianlabs/atlassian-webresource-webpack-plugin/pull-requests/19)).

## 0.2.1 (July 21, 2017)

* Stop `wr-dependency!` import statements from throwing JavaScript exceptions (fixes #11)

## 0.2.0 (July 21, 2017)

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