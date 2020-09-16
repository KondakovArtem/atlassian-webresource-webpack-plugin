const chai = require('chai');
const chaiXml = require('chai-xml');
const chaiString = require('chai-string');
const chaiUuid = require('chai-uuid');
const del = require('del');

function cleanOutputDirs() {
    return del('test/**/target');
}

module.exports = {
    mochaHooks: {
        beforeAll: function (done) {
            // global setup for all tests
            chai.use(chaiXml);
            chai.use(chaiString);
            chai.use(chaiUuid);
            cleanOutputDirs().then(() => done());
        },
    },
};
