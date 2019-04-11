const defaultMerger = (v, k, map) => map.set(k, v);

/**
 * Combines multiple maps in to a single map, allowing control over how
 * the values for keys are stored in the new map.
 *
 * The default behaviour is the value from the last map wins.
 *
 * @example
 * const a = new Map([['first', 1], ['second', 2]]);
 * const b = new Map(['first', 100], ['third', 300]);
 * mergeMaps(a, b) // Map(3) {'first' => 100, 'second' => 2, 'third' => 300}
 *
 * @example
 * const a = new Map([['one', [1,2,3]]]);
 * const b = new Map([['one', [4,5,6]]]);
 * const merger = (map, k, newVal) => {
 *   const oldVal = map.get(k);
 *   map.set(k, [].concat(oldVal).concat(newVal));
 * }
 * mergeMaps(a, b, merger) // Map(1) {'one' => [1,2,3,4,5,6]}
 */
const mergeMaps = (...maps) => {
    const source = new Map();
    const merger = typeof maps[maps.length - 1] === 'function' ? maps.pop() : defaultMerger;
    maps.forEach(map => {
        Array.from(map.entries()).reduce((m, [k, v]) => merger(v, k, m), source);
    });
    return source;
};

module.exports = mergeMaps;
