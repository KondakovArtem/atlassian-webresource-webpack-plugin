const { renderElement } = require('./helpers/xml');

function renderParams(params) {
    if (!params) {
        return '';
    }
    return params.map(param => renderElement('param', param.attributes, param.value)).join('');
}

module.exports = function renderCondition(condition) {
    if (!condition) {
        return '';
    }

    // we have actual conditions
    if (Array.isArray(condition)) {
        return condition.map(renderCondition).join('');
    }
    // we have a "conditions"-joiner for multiple sub conditions
    if (condition.type) {
        return renderElement('conditions', { type: condition.type }, renderCondition(condition.conditions));
    }

    return renderElement(
        'condition',
        ` class="${condition.class}" ${condition.invert ? `invert="true"` : ''}`,
        renderParams(condition.params)
    );
};
