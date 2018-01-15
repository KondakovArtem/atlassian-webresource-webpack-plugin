import $ from 'jquery';
import foo from './foo-dep';
import bar from './bar-dep';

$(() => {
    $('body').html('hello world' + bar() + foo());
    import("./foo-async");
});
