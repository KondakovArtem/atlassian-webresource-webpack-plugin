define('my-app', ['jquery', 'require', 'wr!some.weird:web-resource'], function($, req) {
    req('wr!foo-bar:baz');
    req('wrc!this-is-actually-a-context-whoops');

    $(function () {
        $('body').html("hello world");
    });
});
