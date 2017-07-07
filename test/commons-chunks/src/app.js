import $ from 'jquery';
import bar from './bar';

$(() => {
    $('body').html(`hello world, ${bar}`);
})