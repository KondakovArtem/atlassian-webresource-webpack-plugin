function stringifyAttributes(attributes) {
    if (!attributes) {
        return '';
    }

    return (
        ' ' +
        Object.keys(attributes)
            .map(key => `${key}="${attributes[key]}"`)
            .join(' ')
    );
}

function renderElement(name, attributes, children) {
    if (!children) {
        return `<${name}${attributes}/>`;
    }
    return `<${name}${attributes}>${children}</${name}>`;
}

function renderParams(params) {
    if (!params) {
        return '';
    }
    return params.map(param => renderElement('param', stringifyAttributes(param.attributes), param.value)).join('');
}

module.exports = function renderCondition(condition) {
    // we have actual conditions
    if (Array.isArray(condition)) {
        return condition.map(renderCondition).join('');
    }
    // we have a "conditions"-joiner for multiple sub conditions
    if (condition.type) {
        return renderElement('conditions', ` type="${condition.type}"`, renderCondition(condition.conditions));
    }

    return renderElement(
        'condition',
        ` class="${condition.class}" ${condition.invert ? `invert="true"` : ''}`,
        renderParams(condition.params)
    );
};
