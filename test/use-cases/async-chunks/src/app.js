import _ from 'underscore';

import('./async-bar').then(x => {
    console.log(x);
});

import('./async-foo').then(x => {
    console.log(x);
});
