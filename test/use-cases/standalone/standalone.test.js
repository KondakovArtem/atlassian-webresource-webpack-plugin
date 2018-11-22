const assert = require('chai').assert;
const PrettyData = require('pretty-data').pd;
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'target');
const webresourceOutput = path.join(targetDir, 'META-INF', 'plugin-descriptor', 'wr-webpack-bundles.xml');

describe('standalone', function() {
    let config = require('./webpack.config.js');

    it('compiles an xml file', done => {
        webpack(config, (err, stats) => {
            if (err) {
                throw err;
            }
            assert.equal(stats.hasErrors(), false);
            assert.equal(stats.hasWarnings(), false);
            assert.equal(fs.existsSync(webresourceOutput), true);
            done();
        });
    });

    describe('xml-descriptor', function() {
        let xmlFile;

        before(done => {
            webpack(config, (err, stats) => {
                xmlFile = fs.readFileSync(webresourceOutput, 'utf-8');
                done();
            });
        });

        it('is lean', function() {
            assert.equal(
                xmlFile,
                PrettyData.xml(
                    `
<bundles>
  <web-resource key="entrypoint-standalone-1">
    <resource type="download" name="standalone-1.js" location="standalone-1.js"/>
  </web-resource>
  <web-resource key="entrypoint-standalone-2">
    <resource type="download" name="standalone-2.js" location="standalone-2.js"/>
  </web-resource>
</bundles>
`
                ).trim()
            );
        });
    });
});
