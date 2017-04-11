class SourceUtils {
    constructor(sources) {
        this.sources = sources;
    }
    mapAllSources(func) {
        let {sources} = this;
        return Object.keys(sources).map((key) => {
            const src = sources[key];
            return func(src, key);
        });
    }
    filterAllSources(func) {
        return module.exports
            .mapAllSources((src) => src)
            .filter((src) => func(src));
    }
    getResourceDirectories() {
        let {sources} = this;
        return Object.keys(sources)
            .filter((srcKey) => {
                return !!sources[srcKey].resources
            })
            .map((srcKey) => {
                return sources[srcKey].resources;
            });
    }
};

module.exports = SourceUtils;
