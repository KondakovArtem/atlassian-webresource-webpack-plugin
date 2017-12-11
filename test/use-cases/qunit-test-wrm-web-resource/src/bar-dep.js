import $ from 'jquery';
import 'wr-dependency!some.weird:web-resource';
import 'wr-resource!ultimate/name/at/runtime.js!path/to/my/template.soy';

export default () => {
    // the MySoyTemplateNamespace would be provided via the soy file. It's currently a side-effect of its generation.
    document.body.innerHTML = MySoyTemplateNamespace.Example.sayHello({ name: 'world' });
};
