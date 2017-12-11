module.exports = class WebpackRuntimeHelpers {
    static hookIntoNormalModuleFactory(compiler, cb) {
        compiler.plugin("compile", (params) => {
            params.normalModuleFactory.apply({
                apply(normalModuleFactory) {
                    normalModuleFactory.plugin("factory", cb);
                }
            });
        });
    }
}