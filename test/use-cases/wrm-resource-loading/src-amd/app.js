define('my-app', ['require', 'wr-resource!ultimate/name/at/runtime.css!src-amd/styles.less'], function(req) {
    req('wr-resource!ultimate/name/at/runtime.js!src-amd/template.soy');

    // the MySoyTemplateNamespace would be provided via the soy file. It's currently a side-effect of its generation.
    document.body.innerHTML = MySoyTemplateNamespace.Example.sayHello({ name: 'world' });
});
