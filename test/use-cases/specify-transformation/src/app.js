import $ from 'jquery';
import text from './test.txt';
import styles from './test.less';
import body from './test.html';
import rect from './rect.svg';

$(() => {
    $('body')
        .text(text)
        .html(body)
        .css(styles)
        .append(rect);
});
