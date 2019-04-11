import styles from './styles2.css';


document.querySelector('body').insertAdjacentHTML(
    'afterbegin', 
    `<div class="${styles.wurst}"><div class="${styles.tricky}"></div></div>`
);
