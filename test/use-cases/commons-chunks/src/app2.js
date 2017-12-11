import $ from 'jquery';
import foo2 from './foo2';
import bar from './bar';

$(() => {
    $('body').html(`hello world, ${bar} ${foo2}`);
});
