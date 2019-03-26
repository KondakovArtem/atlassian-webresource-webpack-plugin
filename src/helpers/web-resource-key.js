function sanitizeKey(key) {
    // keys should not contain slashes
    return key.replace(/\//g, '-');
}

module.exports = { sanitizeKey };
