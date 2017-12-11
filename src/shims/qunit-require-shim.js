/**
 * Used for qunit-tests to prevent them from failing if "resources"/"dependencies" are required.
 * This injects a window.require to capture and ignore require-requests to "wr-dependency!/wr-resource!",
 * while forwarding everything else
 */
module.exports = `
!function(){
    var old_require = window.require;
    window.require = function(modRequest){
        if(modRequest.indexOf('wr-dependency!') === 0) {
            return null;
        }
        if(modRequest.indexOf('wr-resource!') === 0) {
            return null;
        }
        return old_require.apply(this, arguments);
    }
}();
`;
