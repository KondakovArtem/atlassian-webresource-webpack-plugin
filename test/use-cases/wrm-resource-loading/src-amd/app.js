define('my-app', ['require', 'wr-resource!ultimate/name/at/runtime.css!path/to/my/styles.less'], function(req) {
    req('wr-resource!ultimate/name/at/runtime.js!path/to/my/template.soy');

    // the MySoyTemplateNamespace would be provided via the soy file. It's currently a side-effect of its generation.
    document.body.innerHTML = MySoyTemplateNamespace.Example.sayHello({ name: 'world' });
});
