import $ from 'jquery';
import "wr!some.weird:web-resource";
import "wr!foo-bar:baz";
import "wrc!this-is-actually-a-context-whoops";

$(() => {
    $('body').html("hello world");
})