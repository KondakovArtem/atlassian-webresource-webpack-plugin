define(function(require) {
    var wrmRequire = require('wrm/require');
    console.log('first, require some external dependencies');
    wrmRequire(['wr!com.atlassian.auiplugin:aui-flag'], function() {
        console.log('now we can load the AUI flag');
        var flag = require('aui/flag');
        flag({
            type: 'success',
            title: 'Our flag loaded lazily!'
        });
    });
});
