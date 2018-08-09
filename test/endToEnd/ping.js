var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../app.js');
var should = chai.should();

chai.use(chaiHttp);

describe('ping', function() {
  it('should respond on /ping GET', function(done) {
    chai.request(server)
      .get('/ping')
      .end(function (err, res) {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.have.property('version');
        done();
      });
  });
});