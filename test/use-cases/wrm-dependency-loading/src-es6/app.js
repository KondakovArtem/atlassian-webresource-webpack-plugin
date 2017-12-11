import $ from 'jquery';
import 'wr-dependency!some.weird:web-resource';
import 'wr-dependency!foo-bar:baz';

$(() => {
    $('body').html('hello world');
});
