const assert = require('chai').assert;
const PrettyData = require('pretty-data').pd;

const renderTransformation = require('../../src/renderTransformation');

describe('renderTransformer', () => {
    it('simple transformation', () => {
        const transformations = { js: ['jsI18n'] };
        const conditionString = renderTransformation(transformations);
        assert.equal(
            PrettyData.xml(conditionString),
            `
<transformation extension="js">
  <transformer key="jsI18n"/>
</transformation>
        `.trim()
        );
    });

    it('multiple transformers', () => {
        const transformations = {
            js: ['jsI18n'],
            soy: ['soyTransformer', 'jsI18n'],
            less: ['lessTransformer'],
        };
        const conditionString = renderTransformation(transformations);
        assert.equal(
            PrettyData.xml(conditionString),
            `
<transformation extension="js">
  <transformer key="jsI18n"/>
</transformation>
<transformation extension="soy">
  <transformer key="soyTransformer"/>
  <transformer key="jsI18n"/>
</transformation>
<transformation extension="less">
  <transformer key="lessTransformer"/>
</transformation>
        `.trim()
        );
    });

    it('contextual transformers', () => {
        const transformations = {
            js: ['js-one', 'js-two', 'js-three'],
            soy: ['soy-one', 'soy-two'],
            less: ['less-one', 'less-two'],
            png: ['png-one'],
        };
        const resources = [{ location: 'a.js' }, { location: 'b.not.really.soy.actually.js' }, { location: 'c.less' }];
        const conditionString = renderTransformation(transformations, resources);

        assert.equal(
            PrettyData.xml(conditionString),
            `
<transformation extension="js">
  <transformer key="js-one"/>
  <transformer key="js-two"/>
  <transformer key="js-three"/>
</transformation>
<transformation extension="less">
  <transformer key="less-one"/>
  <transformer key="less-two"/>
</transformation>
            `.trim()
        );
    });
});
