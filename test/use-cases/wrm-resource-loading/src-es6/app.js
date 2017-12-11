import 'wr-resource!ultimate/name/at/runtime.js!path/to/my/template.soy';
import 'wr-resource!ultimate/name/at/runtime.css!path/to/my/styles.less';

// the MySoyTemplateNamespace would be provided via the soy file. It's currently a side-effect of its generation.
document.body.innerHTML = MySoyTemplateNamespace.Example.sayHello({ name: 'world' });
