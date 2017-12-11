import $ from 'jquery';
import styles from './styles.css';

$(() => {
    $('body').append(`<div class="${styles.wurst}"><div class="${styles.tricky}"></div></div>`);
});
