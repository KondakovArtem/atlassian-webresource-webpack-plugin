const assert = require('chai').assert;

const ProvidedExternalDependencyModule = require('../../src/webpack-modules/ProvidedExternalDependencyModule');

describe('ProvidedExternalDependencyModule', () => {
    describe('libIdent', () => {
        it("should specify a 'libIdent' method used by webpack to create a unique id", () => {
            const pedm = new ProvidedExternalDependencyModule({ amd: 'something' }, 'some-dependency', 'amd');
            assert.ok(pedm.libIdent(), 'libIdent did not return a valid value');
        });

        it('should create deterministic ids based on specified params', () => {
            const firstProvidedModule = new ProvidedExternalDependencyModule(
                { amd: 'something' },
                'some-dependency',
                'amd'
            );
            const secondProvidedModule = new ProvidedExternalDependencyModule(
                { amd: 'something' },
                'some-dependency',
                'amd'
            );
            assert.strictEqual(
                firstProvidedModule.libIdent(),
                secondProvidedModule.libIdent(),
                'libIdent did not return the expected values'
            );
        });

        it('should return a unique value for unique constructor params', () => {
            const firstProvidedModule = new ProvidedExternalDependencyModule(
                { amd: 'something' },
                'some-dependency',
                'amd'
            );
            const secondProvidedModule = new ProvidedExternalDependencyModule(
                { amd: 'something-else' },
                'some-dependency',
                'amd'
            );
            const thirdProvidedModule = new ProvidedExternalDependencyModule(
                { amd: 'something' },
                'some-other-dependency',
                'amd'
            );
            assert.notStrictEqual(
                firstProvidedModule.libIdent(),
                secondProvidedModule.libIdent(),
                'unexpected matching libIdent values'
            );
            assert.notStrictEqual(
                firstProvidedModule.libIdent(),
                thirdProvidedModule.libIdent(),
                'unexpected matching libIdent values'
            );
            assert.notStrictEqual(
                secondProvidedModule.libIdent(),
                thirdProvidedModule.libIdent(),
                'unexpected matching libIdent values'
            );
        });
    });
});
