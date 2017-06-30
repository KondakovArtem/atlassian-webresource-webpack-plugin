module.exports = {
    jquery : {
        dependency: "jira.webresources:jquery",
        import: "require('jquery')",
    },
    backbone: {
        dependency: "com.atlassian.plugin.jslibs:backbone-1.0.0-factory",
        import: "require('backbone')",
    },
    marionette: {
        dependency: "com.atlassian.plugin.jslibs:marionette-1.4.1-factory",
        import: "require('marionette')",
    },
    underscore: {
        dependency: "com.atlassian.plugin.jslibs:underscore-1.4.4",
        import: "require('underscore')",
    },
    skate: {
        dependency: "com.atlassian.plugin.jslibs:skate-0.12.6",
        import: "require('skate')",
    },
    brace: {
        dependency: "com.atlassian.plugin.jslibs:brace-2014.09.03-factory",
        import: "require('brace')",
    },
    uri: {
        dependency: "com.atlassian.plugin.jslibs:uri-1.14.1",
        import: "require('uri')",
    },
    moment: {
        dependency: "com.atlassian.plugin.jslibs:moment-2.10.3",
        import: "require('moment')",
    }
};
