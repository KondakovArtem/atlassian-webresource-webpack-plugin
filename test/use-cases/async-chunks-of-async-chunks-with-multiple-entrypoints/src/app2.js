import _ from 'underscore';

import(/* webpackChunkName: "async-bar" */ './async-bar').then(x => {
    console.log(x);
});
