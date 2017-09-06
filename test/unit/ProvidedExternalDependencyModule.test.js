const assert = require('chai').assert;

const ProvidedExternalDependencyModule = require("../../src/ProvidedExternalDependencyModule");


describe("ProvidedExternalDependencyModule", () => {

    describe("libIdent", () => {
        it("should specify a 'libIdent' method used by webpack to create a unique id", () => {
            const pedm = new ProvidedExternalDependencyModule({amd: "something"}, "some-dependency", "amd");
            assert.ok(pedm.libIdent(), "libIdent did not return a valid value");
        });
    
        it("should create deterministic ids based on specified params", () => {
            const pedm1 = new ProvidedExternalDependencyModule({amd: "something"}, "some-dependency", "amd");
            const pedm2 = new ProvidedExternalDependencyModule({amd: "something"}, "some-dependency", "amd");
            assert.strictEqual(pedm1.libIdent(), pedm1.libIdent(), "libIdent did not return the expected values");
        });

        it("should return a unique value for unique constructor params", () => {
            const pedm1 = new ProvidedExternalDependencyModule({amd: "something"}, "some-dependency", "amd");
            const pedm2 = new ProvidedExternalDependencyModule({amd: "something-else"}, "some-dependency", "amd");
            const pedm3 = new ProvidedExternalDependencyModule({amd: "something"}, "some-other-dependency", "amd");
            assert.notStrictEqual(pedm1.libIdent(), pedm2.libIdent(), "unexpected matching libIdent values");
            assert.notStrictEqual(pedm1.libIdent(), pedm3.libIdent(), "unexpected matching libIdent values");
            assert.notStrictEqual(pedm2.libIdent(), pedm3.libIdent(), "unexpected matching libIdent values");
        });
    })
});