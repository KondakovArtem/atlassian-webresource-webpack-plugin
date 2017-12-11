define('my-app', ['jquery', 'require', 'wr-dependency!some.weird:web-resource'], function($, req) {
    req('wr-dependency!foo-bar:baz');

    $(function() {
        $('body').html('hello world');
    });
});
