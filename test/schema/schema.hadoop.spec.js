// do not use import, otherwise other test units won't be able to reactivate nock
const {assert,expect} = require('chai');
const {SCHEMAS} = require('../../src/common/constants');
const Validator = require('jsonschema').Validator;
let v;

describe('Hadoop Schema:', function () {

    before(function() {
        v = new Validator();
    });
    it('should validate a valid object agasint the hadoop', function() {
        const hadoopConnection = {
            host: 'localhost',
            port: 9000,
            database:'plotly.db',
            timeout: 1000
        };
        let rst = v.validate( hadoopConnection, SCHEMAS.HADOOP_ATTRIBUTES_SCHEMA);
        assert(rst.valid);
    });

    it('should fail to validate hadoop connection because missing host', function() {
        const hadoopConnection = {
            port: 9000,
            database:'plotly.db',
            timeout: 1000
        };

        let rst;
        try{
            rst = v.validate( hadoopConnection, SCHEMAS.HADOOP_ATTRIBUTES_SCHEMA);
            expect(rst.errors[0].message).to.equal('requires property "host"');
        }catch(err){
            assert.isOk(!rst.valid, 'Test Passed failed validation');
        }
    });

    it('should fail to validate hadoop connection because missing port', function() {
        const hadoopConnection = {
            host: '127.0.0.1',
            database:'plotly.db',
            timeout: 1000
        };

        let rst;
        try{
            rst = v.validate( hadoopConnection, SCHEMAS.HADOOP_ATTRIBUTES_SCHEMA);
            expect(rst.errors[0].message).to.equal('requires property "port"');
        }catch(err){
            assert.isOk(!rst.valid, 'Test Passed failed validation');
        }
    });

    it('should fail to validate hadoop connection because missing timeout', function() {
        const hadoopConnection = {
            host: '127.0.0.1',
            port: 9000,
            database:'plotly.db',
        };

        let rst;
        try{
            rst = v.validate( hadoopConnection, SCHEMAS.HADOOP_ATTRIBUTES_SCHEMA);
            expect(rst.errors[0].message).to.equal('requires property "timeout"');
        }catch(err){
            assert.isOk(!rst.valid, 'Test Passed failed validation');
        }
    });

    it('should validate hadoop connection without database', function() {
        const hadoopConnection = {
            host: '127.0.0.1',
            port: 9000,
            timeout: 1000
        };

        let rst = v.validate( hadoopConnection, SCHEMAS.HADOOP_ATTRIBUTES_SCHEMA);
        assert(rst.valid);
    });
});
