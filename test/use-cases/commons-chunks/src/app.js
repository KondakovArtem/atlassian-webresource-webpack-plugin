import $ from 'jquery';
import foo from './foo';
import bar from './bar';

$(() => {
    $('body').html(`hello world, ${bar} ${foo}`);
});
