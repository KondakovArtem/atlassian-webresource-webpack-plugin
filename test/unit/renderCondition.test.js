const assert = require('chai').assert;
const PrettyData = require('pretty-data').pd;

const renderCondition = require('../../src/renderCondition');

describe('renderCondition', () => {
    describe('should correctly render condition', () => {
        it('simple condition', () => {
            const conditionString = PrettyData.xml(renderCondition({ class: 'foo.bar' }));
            assert.equal(conditionString, '<condition class="foo.bar" />');
        });

        it('invert condition', () => {
            const conditionString = PrettyData.xml(renderCondition({ class: 'foo.bar', invert: true }));
            assert.equal(conditionString, '<condition class="foo.bar" invert="true"/>');
        });

        describe('with params', () => {
            it('renders param correctly', () => {
                const conditionString = PrettyData.xml(
                    renderCondition({ class: 'foo.bar', invert: true, params: [{}] })
                );
                assert.equal(
                    conditionString,
                    `
<condition class="foo.bar" invert="true">
  <param/>
</condition>                
`.trim()
                );
            });

            it('renders param with value correctly', () => {
                const conditionString = PrettyData.xml(
                    renderCondition({ class: 'foo.bar', invert: true, params: [{ value: 'foo' }] })
                );
                assert.equal(
                    conditionString,
                    `
<condition class="foo.bar" invert="true">
  <param>foo</param>
</condition>
                    `.trim()
                );
            });

            it('renders param with attributes correctly', () => {
                const conditionString = PrettyData.xml(
                    renderCondition({
                        class: 'foo.bar',
                        invert: true,
                        params: [{ attributes: { foo: 'bar', faz: 'baz' } }],
                    })
                );
                assert.equal(
                    conditionString,
                    `
<condition class="foo.bar" invert="true">
  <param foo="bar" faz="baz"/>
</condition>
                    `.trim()
                );
            });

            it('renders param with attributes and values correctly', () => {
                const conditionString = PrettyData.xml(
                    renderCondition({
                        class: 'foo.bar',
                        invert: true,
                        params: [{ attributes: { foo: 'bar', faz: 'baz' }, value: 'more foo' }],
                    })
                );
                assert.equal(
                    conditionString,
                    `
<condition class="foo.bar" invert="true">
  <param foo="bar" faz="baz">more foo</param>
</condition>
                    `.trim()
                );
            });

            it('renders multiple params correctly', () => {
                const conditionString = PrettyData.xml(
                    renderCondition({
                        class: 'foo.bar',
                        invert: true,
                        params: [
                            { attributes: { foo: 'bar', faz: 'baz' }, value: 'more foo' },
                            { attributes: { foo2: 'bar2' }, value: 'more foo2' },
                        ],
                    })
                );
                assert.equal(
                    conditionString,
                    `
<condition class="foo.bar" invert="true">
  <param foo="bar" faz="baz">more foo</param>
  <param foo2="bar2">more foo2</param>
</condition>
                    `.trim()
                );
            });
        });

        it('multiple conditions with params', () => {
            const conditionString = PrettyData.xml(
                renderCondition([
                    {
                        class: 'foo.bar',
                        invert: true,
                        params: [
                            { attributes: { foo: 'bar', faz: 'baz' }, value: 'more foo' },
                            { attributes: { foo2: 'bar2' }, value: 'more foo2' },
                        ],
                    },
                    {
                        class: 'foo.bar.baz',
                        invert: true,
                        params: [
                            { attributes: { foo: 'bar', faz: 'baz' }, value: 'more foo' },
                            { attributes: { foo2: 'bar2' }, value: 'more foo2' },
                        ],
                    },
                ])
            );
            assert.equal(
                conditionString,
                `
<condition class="foo.bar" invert="true">
  <param foo="bar" faz="baz">more foo</param>
  <param foo2="bar2">more foo2</param>
</condition>
<condition class="foo.bar.baz" invert="true">
  <param foo="bar" faz="baz">more foo</param>
  <param foo2="bar2">more foo2</param>
</condition>
                `.trim()
            );
        });
    });

    describe('should correctly render conditions', () => {
        it('simple conditions', () => {
            const conditionString = PrettyData.xml(
                renderCondition({
                    type: 'AND',
                    conditions: [],
                })
            );
            assert.equal(conditionString, '<conditions type="AND"/>');
        });

        it('renders conditions inside correctly', () => {
            const conditionString = PrettyData.xml(
                renderCondition({
                    type: 'AND',
                    conditions: [{ class: 'foo.bar', invert: true }],
                })
            );
            assert.equal(
                conditionString,
                `
<conditions type="AND">
  <condition class="foo.bar" invert="true"/>
</conditions>
            `.trim()
            );
        });

        it('renders multiple conditions inside correctly', () => {
            const conditionString = PrettyData.xml(
                renderCondition({
                    type: 'AND',
                    conditions: [
                        { class: 'foo.bar', invert: true },
                        { class: 'foo.bar', invert: true },
                        { class: 'foo.bar', invert: true },
                    ],
                })
            );
            assert.equal(
                conditionString,
                `
<conditions type="AND">
  <condition class="foo.bar" invert="true"/>
  <condition class="foo.bar" invert="true"/>
  <condition class="foo.bar" invert="true"/>
</conditions>
            `.trim()
            );
        });

        it('renders complex nested conditions correctly', () => {
            const conditionString = PrettyData.xml(
                renderCondition({
                    type: 'AND',
                    conditions: [
                        {
                            type: 'OR',
                            conditions: [
                                {
                                    class: 'foo.bar.baz',
                                    invert: true,
                                    params: [{ attributes: { name: 'permission' }, value: 'admin' }],
                                },
                                {
                                    class: 'foo.bar.baz2',
                                    params: [{ attributes: { name: 'permission' }, value: 'project' }],
                                },
                            ],
                        },
                        {
                            class: 'foo.bar.baz3',
                            params: [{ attributes: { name: 'permission' }, value: 'admin' }],
                        },
                    ],
                })
            );
            assert.equal(
                conditionString,
                `
<conditions type="AND">
  <conditions type="OR">
    <condition class="foo.bar.baz" invert="true">
      <param name="permission">admin</param>
    </condition>
    <condition class="foo.bar.baz2" >
      <param name="permission">project</param>
    </condition>
  </conditions>
  <condition class="foo.bar.baz3" >
    <param name="permission">admin</param>
  </condition>
</conditions>
            `.trim()
            );
        });
    });
});
