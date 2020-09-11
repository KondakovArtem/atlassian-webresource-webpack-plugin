const chai = require('chai');
const chaiXml = require('chai-xml');
const chaiString = require('chai-string');
const chaiUuid = require('chai-uuid');

module.exports = {
    mochaHooks: {
        beforeAll: function () {
            // global setup for all tests
            chai.use(chaiXml);
            chai.use(chaiString);
            chai.use(chaiUuid);
        },
    },
};
