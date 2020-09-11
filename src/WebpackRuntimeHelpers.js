const { webpack5or4 } = require('./helpers/conditional-logic');

module.exports = class WebpackRuntimeHelpers {
    static hookIntoNormalModuleFactory(compiler, cb) {
        compiler.hooks.compile.tap('RuntimeHelper Compiler', params => {
            const hooks = params.normalModuleFactory.hooks;
            webpack5or4(
                () => {
                    const passThruFactory = (data, callback) => callback();
                    hooks.factorize.tapAsync(
                        {
                            name: 'RuntimeHelper NormalModuleFactory',
                            stage: 99,
                        },
                        cb(passThruFactory)
                    );
                },
                () => {
                    hooks.factory.tap('RuntimeHelper NormalModuleFactory', cb);
                }
            );
        });
    }
};
