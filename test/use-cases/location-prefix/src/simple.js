define('module/a', [
    'wr-resource!ultimate/name/at/runtime.js!template.soy',
    'wr-resource!ultimate/name/at/runtime.css!styles.less',
], function() {
    console.log('it really is simple.');
});
