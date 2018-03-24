module.exports = class WebpackRuntimeHelpers {
    static hookIntoNormalModuleFactory(compiler, cb) {
        compiler.hooks.compile.tap('RuntimeHelper Compiler', params => {
            params.normalModuleFactory.hooks.factory.tap('RuntimeHelper NormalModuleFactory', cb);
        });
    }
};
