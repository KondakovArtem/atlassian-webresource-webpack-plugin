import $ from 'jquery';
import bar from './bar-dep';

$(() => {
    $('body').html('hello world' + bar() + foo());
});
