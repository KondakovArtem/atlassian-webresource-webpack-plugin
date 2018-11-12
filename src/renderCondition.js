const WRMHelpers = require('./WRMHelpers');

function renderParams(params) {
    if (!params) {
        return '';
    }
    return params
        .map(param => WRMHelpers.renderElement('param', WRMHelpers.stringifyAttributes(param.attributes), param.value))
        .join('');
}

module.exports = function renderCondition(condition) {
    // we have actual conditions
    if (Array.isArray(condition)) {
        return condition.map(renderCondition).join('');
    }
    // we have a "conditions"-joiner for multiple sub conditions
    if (condition.type) {
        return WRMHelpers.renderElement(
            'conditions',
            ` type="${condition.type}"`,
            renderCondition(condition.conditions)
        );
    }

    return WRMHelpers.renderElement(
        'condition',
        ` class="${condition.class}" ${condition.invert ? `invert="true"` : ''}`,
        renderParams(condition.params)
    );
};
