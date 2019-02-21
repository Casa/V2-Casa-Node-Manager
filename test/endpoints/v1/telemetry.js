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

  afterEach(() => {
    clock.restore();
    dockerodeListAllContainers.restore();
    dockerodeListImages.restore();
  });

  // Get a JWT
  // TODO: This should be moved to a place where the code can be shared.
  describe('v1/accounts/register POST', () => {

    const randomUsername = uuidv4();
    const randomPassword = uuidv4();

    it('should register a new user and return a new JWT', done => {

      // Clear any existing users out of the system otherwise a 'User already exists' error will be returned
      fs.writeFile(`${__dirname}/../../fixtures/accounts/user.json`, '', err => {
        if (err) {
          throw err;
        }
      });

      requester
        .post('/v1/accounts/register')
        .auth(randomUsername, randomPassword)
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

  describe('v1/telemetry/serial GET', function() {

    it('should return the serial ID of the device', done => {
      requester
        .get('/v1/telemetry/serial')
        .set('authorization', `JWT ${token}`)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.equal('fake_serial_id'); // From the stub in globals.js
          done();
        });
    });
  });

  describe.skip('v1/telemetry/status GET', function() {

    dockerodeListAllContainers = sinon.stub(require('dockerode').prototype, 'listContainers')
      .yields(null, dockerodeMocks.listAllContainers());
    dockerodeListImages = sinon.stub(require('dockerode').prototype, 'listImages')
      .yields(null, dockerodeMocks.listImages());
    // TODO: stub the dockerode.df() function (gets disk usage)
    //dockerodeGetDiskUsage = sinon.stub(require('dockerode').prototype, 'df')
    //  .yields(null, dockerodeMocks.df());


    it('should return the status of the containers', done => {
      requester
        .get('/v1/telemetry/status')
        .set('authorization', `JWT ${token}`)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          console.log(res.body);
          res.should.have.status(200);
          done();
        });
    });
  });

});

