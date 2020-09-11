const { webpack5or4 } = require('./helpers/conditional-logic');
const { Compilation } = require('webpack');

/** @typedef {import("webpack/lib/Compiler")} Compiler */
/** @typedef {import("webpack/lib/Compilation")} Compilation */

module.exports = class WebpackRuntimeHelpers {
    /**
     * @param {Compiler} compiler
     * @param {Function} cb
     */
    static hookIntoNormalModuleFactory(stageName, compiler, cb) {
        compiler.hooks.compile.tap(stageName, params => {
            const hooks = params.normalModuleFactory.hooks;
            webpack5or4(
                () => {
                    const passThruFactory = (data, callback) => callback();
                    hooks.factorize.tapAsync(
                        {
                            name: stageName,
                            stage: 99,
                        },
                        cb(passThruFactory)
                    );
                },
                () => {
                    hooks.factory.tap(stageName, cb);
                }
            );
        });
    }

    /**
     * @param {Compiler} compiler
     * @param {Function} cb
     */
    static hookIntoAssetAnalysisStage(stageName, compiler, cb) {
        compiler.hooks.compilation.tap(stageName, compilation => {
            webpack5or4(
                () => {
                    compilation.hooks.processAssets.tapAsync(
                        {
                            name: stageName,
                            stage: Compilation.PROCESS_ASSETS_STAGE_ANALYSE,
                        },
                        (_, callback) => cb(compilation, callback)
                    );
                },
                () => {
                    compiler.hooks.emit.tapAsync(stageName, (_, callback) => cb(compilation, callback));
                }
            );
        });
    }
};
