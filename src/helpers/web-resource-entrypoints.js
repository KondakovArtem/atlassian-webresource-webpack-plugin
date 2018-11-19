class Helpers {
    static getContextForEntry(entry, contextMap) {
        const contexts = [].concat(entry).concat(contextMap[entry]);
        const validContexts = contexts.filter(context => context && typeof context === 'string');
        return validContexts;
    }

    static getWebresourceAttributesForEntry(entry, webresourceKeyMap) {
        const wrKey = webresourceKeyMap[entry];
        const wrKeyType = typeof wrKey;
        if (wrKeyType === 'object' && typeof wrKey.key === 'string') {
            return { key: wrKey.key, name: wrKey.name, state: wrKey.state };
        }
        if (!wrKey || wrKeyType !== 'string') {
            return { key: `entrypoint-${entry}` };
        }
        return { key: wrKey };
    }

    static getConditionForEntry(entry, conditionMap) {
        return conditionMap[entry];
    }
}

module.exports = {
    getContextForEntry: Helpers.getContextForEntry,
    getConditionForEntry: Helpers.getConditionForEntry,
    getWebresourceAttributesForEntry: Helpers.getWebresourceAttributesForEntry,
};
