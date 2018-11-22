/**
 * @param {*} val - the initial value of varying type
 * @returns {string} a trimmed string value
 */
function parseString(val) {
    let maybeStr = val && val.length ? String(val) : '';
    return maybeStr.trim();
}

module.exports = {
    parseString,
};
