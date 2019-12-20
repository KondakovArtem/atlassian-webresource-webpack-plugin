const assert = require('chai').assert;

const WebpackHelpers = require('../../src/WebpackHelpers');
const env = Object.assign({}, process.env);

const stubCompiler = mode => ({ options: { mode } });

describe('isRunningInProductionMode', () => {
    afterEach(() => {
        process.env = env;
    });

    it('determines production mode from compiler settings', function() {
        assert.equal(
            WebpackHelpers.isRunningInProductionMode(stubCompiler('production')),
            true,
            'production environment not detected properly'
        );
    });

    it('returns false if mode is different than production', function() {
        assert.equal(
            WebpackHelpers.isRunningInProductionMode(stubCompiler('')),
            false,
            'it should not detect production environment'
        );
    });

    it('fallbacks to node.env when mode set to none', function() {
        process.env.NODE_ENV = 'production';
        assert.equal(
            WebpackHelpers.isRunningInProductionMode(stubCompiler('none')),
            true,
            'production environment not detected properly'
        );
    });
});
