const EmptyExportsModule = require('./EmptyExportsModule');
const path = require('path');

module.exports = class extends EmptyExportsModule {
    constructor(resourceNameAndLocationPair, target, requestContext, rootContext) {
        super(resourceNameAndLocationPair, target);
        const resourcePair = resourceNameAndLocationPair.split('!');
        let resPath = resourcePair[1];

        // enable relative resource-paths. Still requires that this resource is correctly copied to the right location in target.
        if (resPath.startsWith('./') || resPath.startsWith('../')) {
            const fullResourcePath = path.join(requestContext, resPath);
            resPath = path.relative(rootContext, fullResourcePath);
        }

        this._resource = [resourcePair[0], resPath];
    }

    getResourcePair() {
        return this._resource;
    }
};
