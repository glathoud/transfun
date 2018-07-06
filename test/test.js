/*for node.js*/

var assert = require('assert');

var transfun_test = require('../test.js').test;

describe('all', function () {
    it('should return true, and not throw any error', function () {
        assert.equal( transfun_test(), true );
    });
});
