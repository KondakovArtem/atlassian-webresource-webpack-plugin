module.exports = `
!function(){
    var old_require = window.require;
    window.require = function(modRequest){
        if(modRequest.indexOf('wr-dependency!') === 0) {
            return null;
        }
        return old_require.apply(this, arguments);
    }
}();
`;