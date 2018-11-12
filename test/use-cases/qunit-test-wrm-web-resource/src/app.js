import $ from 'jquery';
import bar from './bar-dep';
import foo from './foo-dep';

$(() => {
    $('body').html('hello world' + bar() + foo());
    import('./foo-async');
});
