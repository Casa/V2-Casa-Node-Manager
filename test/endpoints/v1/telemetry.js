/* eslint-disable max-len,id-length,no-magic-numbers,no-empty-function,no-undef */
/* globals requester, reset */
const sinon = require('sinon');
const dockerodeMocks = require('../../mocks/dockerode.js');
const uuidv4 = require('uuid/v4');
const fs = require('fs');

describe('v1/telemetry endpoints', () => {
  let token;

  before(async() => {
    reset();
  });

  after(async() => {

  });

  // Get a JWT
  // TODO: This should be moved to a place where the code can be shared.
  describe('v1/accounts/register POST', () => {

    const randomUsername = uuidv4();
    const randomPassword = uuidv4();

    it('should register a new user and return a new JWT', done => {

      // Clear any existing users out of the system otherwise a 'User already exists' error will be returned
      fs.writeFile(`${__dirname}/../../fixtures/accounts/user.json`, '', function() {
        console.log('erased file'); // TODO is a callback a requirement here?
      });

      requester
        .post('/v1/accounts/register')
        .auth('username', 'password')  // TODO you shouldn't need a JWT to register. Basic Auth is being enforced here.
        //.set('authorization', `Basic ${token}`)  // This line also works
        .send({username: randomUsername, password: randomPassword})
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.should.be.json;
          res.body.jwt.should.not.be.empty;
          token = res.body.jwt;
          done();
        });
    });
  });

  describe('v1/telemetry/versions GET', function() {

    let clock;
    let dockerodeListAllContainers;
    let dockerodeListImages;

    afterEach(() => {
      clock.restore();
      dockerodeListAllContainers.restore();
      dockerodeListImages.restore();
    });

    it('should have no updatable containers', done => {

      clock = sinon.useFakeTimers({
        now: 1546416000000, // January 2, 2019 Midnight PST
        shouldAdvanceTime: false,
      });

      dockerodeListAllContainers = sinon.stub(require('dockerode').prototype, 'listContainers')
        .yields(null, dockerodeMocks.listAllContainers());
      dockerodeListImages = sinon.stub(require('dockerode').prototype, 'listImages')
        .yields(null, dockerodeMocks.listImages());

      requester
        .get('/v1/telemetry/version')
        .set('authorization', `JWT ${token}`)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.should.be.json;

          res.body.should.have.property('lnd');
          res.body['lnd'].updatable.should.equal(false);
          res.body.should.have.property('bitcoind');
          res.body['bitcoind'].updatable.should.equal(false);
          res.body.should.have.property('lnapi');
          res.body['lnapi'].updatable.should.equal(false);
          res.body.should.have.property('space-fleet');
          res.body['space-fleet'].updatable.should.equal(false);
          res.body.should.have.property('manager');
          res.body['manager'].updatable.should.equal(false);
          res.body.should.have.property('update-manager');
          res.body['update-manager'].updatable.should.equal(false);
          res.body.should.have.property('logspout');
          res.body['logspout'].updatable.should.equal(false);
          res.body.should.have.property('syslog');
          res.body['syslog'].updatable.should.equal(false);

          done();
        });
    });

    it('should have an updatable containers', done => {

      clock = sinon.useFakeTimers({
        now: 1546416000000, // January 2, 2019 Midnight PST
        shouldAdvanceTime: false,
      });

      dockerodeListAllContainers = sinon.stub(require('dockerode').prototype, 'listContainers')
        .yields(null, dockerodeMocks.listAllContainers());
      dockerodeListImages = sinon.stub(require('dockerode').prototype, 'listImages')
        .yields(null, dockerodeMocks.listImagesWithUpdate());

      requester
        .get('/v1/telemetry/version')
        .set('authorization', `JWT ${token}`)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.should.be.json;

          res.body.should.have.property('lnd');
          res.body['lnd'].updatable.should.equal(false);
          res.body.should.have.property('bitcoind');
          res.body['bitcoind'].updatable.should.equal(false);
          res.body.should.have.property('lnapi');
          res.body['lnapi'].updatable.should.equal(false);
          res.body.should.have.property('space-fleet');
          res.body['space-fleet'].updatable.should.equal(false);
          res.body.should.have.property('manager');
          res.body['manager'].updatable.should.equal(true);
          res.body.should.have.property('update-manager');
          res.body['update-manager'].updatable.should.equal(false);
          res.body.should.have.property('logspout');
          res.body['logspout'].updatable.should.equal(false);
          res.body.should.have.property('syslog');
          res.body['syslog'].updatable.should.equal(false);

          done();
        });
    });

    it('should have no updatable containers if one exists, but was pulled in the last 90 minutes', done => {

      clock = sinon.useFakeTimers({
        now: 1546329600000, // January 1, 2019 Midnight PST
        shouldAdvanceTime: false,
      });

      dockerodeListAllContainers = sinon.stub(require('dockerode').prototype, 'listContainers')
        .yields(null, dockerodeMocks.listAllContainers());
      dockerodeListImages = sinon.stub(require('dockerode').prototype, 'listImages')
        .yields(null, dockerodeMocks.listImagesWithUpdate());

      requester
        .get('/v1/telemetry/version')
        .set('authorization', `JWT ${token}`)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.should.be.json;

          res.body.should.have.property('lnd');
          res.body['lnd'].updatable.should.equal(false);
          res.body.should.have.property('bitcoind');
          res.body['bitcoind'].updatable.should.equal(false);
          res.body.should.have.property('lnapi');
          res.body['lnapi'].updatable.should.equal(false);
          res.body.should.have.property('space-fleet');
          res.body['space-fleet'].updatable.should.equal(false);
          res.body.should.have.property('manager');
          res.body['manager'].updatable.should.equal(false);
          res.body.should.have.property('update-manager');
          res.body['update-manager'].updatable.should.equal(false);
          res.body.should.have.property('logspout');
          res.body['logspout'].updatable.should.equal(false);
          res.body.should.have.property('syslog');
          res.body['syslog'].updatable.should.equal(false);

          done();
        });
    });
  });
});

