const assert = require('chai').assert;

const WrmDependencyModule = require('../../../src/webpack-modules/WrmDependencyModule');

describe('WrmDependencyModule', () => {
    const type = 'static';
    const resourceKey = 'my.atlassian.plugin';

    it('should accept valid web-resource key', () => {
        const dependency = `${resourceKey}:my-web-resource`;
        const module = new WrmDependencyModule(dependency, type, resourceKey);
        assert.equal(module.getDependency(), dependency);
    });

    it('should add resource key when ":" is missing', () => {
        const firstDependency = 'my-web-resource';
        const firstModule = new WrmDependencyModule(firstDependency, type, resourceKey);
        assert.equal(firstModule.getDependency(), `${resourceKey}:${firstDependency}`);

        const secondDependency = 'my.web.resource';
        const secondModule = new WrmDependencyModule(secondDependency, type, resourceKey);
        assert.equal(secondModule.getDependency(), `${resourceKey}:${secondDependency}`);
    });
});
