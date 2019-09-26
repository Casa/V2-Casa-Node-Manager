const constants = require('utils/const.js');
const sinon = require('sinon');
const should = require('chai').should();
const diskMocks = require('../mocks/disk.js');
const diskLogic = require('logic/disk.js');


describe('diskLogic', function() {

  describe('getBuildArtifacts', function() {

    it('should return no artifacts if nothing is installed', async function() {
      const artifacts = await diskLogic.getBuildDetails([]);
      artifacts.length.should.equal(0);
    });

    it('should return one artifact', async function() {

      let callback = sinon.stub(require('services/disk.js'), 'readJsonFile');
      callback.withArgs(constants.WORKING_DIRECTORY + '/manager/0.1.0/settings-injection.json').returns([2]);
      callback.withArgs(constants.WORKING_DIRECTORY + '/manager/0.1.0/dependencies.json').returns([3]);
      //dockerodeListAllContainers = sinon.stub(require('dockerode').prototype, 'listContainers')
      //  .yields(null, dockerodeMocks.listAllContainers());

      const artifacts = await diskLogic.getBuildDetails([{
        name: 'manager',
        version: '0.1.0',
      }]);

      artifacts.length.should.equal(1);
    });

  })

});
