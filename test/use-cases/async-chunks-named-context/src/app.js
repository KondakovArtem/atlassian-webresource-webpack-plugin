import _ from 'underscore';

import(/* webpackChunkName: "async-bar" */ './async-bar').then(x => {
    console.log(_.wrap(x));
});

import(/* webpackChunkName: "async-foo" */ './async-foo').then(x => {
    console.log(_.wrap(x));
});
