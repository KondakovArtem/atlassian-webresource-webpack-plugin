import $ from 'jquery';
import _ from 'underscore';

export default () => {
    import(/* webpackChunkName: "async-async-bar" */ './async-async-bar');
    import(/* webpackChunkName: "async-async-bar-two" */ './async-async-bar-two');
};
