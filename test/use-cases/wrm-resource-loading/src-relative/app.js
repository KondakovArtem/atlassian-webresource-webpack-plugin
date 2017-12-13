import 'wr-resource!ultimate/name/at/runtime.js!./template.soy';
import 'wr-resource!ultimate/name/at/runtime.css!./styles.less';

// the MySoyTemplateNamespace would be provided via the soy file. It's currently a side-effect of its generation.
document.body.innerHTML = MySoyTemplateNamespace.Example.sayHello({ name: 'world' });
