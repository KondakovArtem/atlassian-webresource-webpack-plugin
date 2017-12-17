const assert = require('chai').assert;
const PrettyData = require('pretty-data').pd;

const renderTransformation = require('../../src/renderTransformation');

describe('renderTransformer', () => {
    it('simple transformation', () => {
        const conditionString = PrettyData.xml(renderTransformation({ js: ['jsI18n'] }));
        assert.equal(
            conditionString,
            `
<transformation extension="js">
  <transformer key="jsI18n"/>
</transformation>
        `.trim()
        );
    });

    it('multiple transformers', () => {
        const conditionString = PrettyData.xml(
            renderTransformation({
                js: ['jsI18n'],
                soy: ['soyTransformer', 'jsI18n'],
                less: ['lessTransformer'],
            })
        );
        assert.equal(
            conditionString,
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
});
