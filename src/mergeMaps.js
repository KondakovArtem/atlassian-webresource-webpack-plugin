module.exports = function mergeMaps(source, ...maps) {
    const merger = typeof maps[maps.length - 1] === 'function' ? maps.pop() : (map, k, v) => map.set(k, v);
    maps.forEach(map => {
        Array.from(map.entries()).reduce((m, [k, v]) => merger(m, k, v), source);
    });
    return source;
};
