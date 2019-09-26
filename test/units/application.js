const constants = require('utils/const.js');
const sinon = require('sinon');
const should = require('chai').should();
const applicationLogic = require('logic/application.js');


describe('applicationLogic', function() {

  describe('getServiceBootOrder', function() {

    const explorerBuildDetails = { name: 'explorer',
      version: '0.1.0',
      priority: 'user',
      metadata: {
        services: [
          {
            name: 'explorer',
            version: '0.1.0',
            dependencies: [],
            env: []
          }
        ],
      },
      ymlPath: '/usr/local/casa/applications/explorer/0.1.0/explorer.yml',
    };

    const torBuildDetails = { name: 'tor',
      version: '0.1.0',
      priority: 'user',
      metadata: {
        services: [
          {
            name: 'tor',
            version: '0.1.0',
            dependencies: [],
            env: []
          }
        ],
      },
      ymlPath: '/usr/local/casa/applications/tor/0.1.0/tor.yml',
    };

    const bitcoindBuildDetails = { name: 'bitcoind',
      version: '0.1.0',
      priority: 'user',
      metadata: {
        services: [
          {
            name: 'bitcoind',
            version: '0.1.0',
            dependencies: [
              {
                application: 'tor',
                service: 'tor',
                version: '0.1.0',
              }
            ],
            env: []
          }
        ],
      },
      ymlPath: '/usr/local/casa/applications/bitcoind/0.1.0/bitcoind.yml',
    };

    const lightningNodeBuildDetails = { name: 'lightning-node',
      version: '0.1.0',
      priority: 'user',
      metadata: {
        services: [
          {
            name: 'bitcoind',
            version: '0.1.0',
            dependencies: [
              {
                application: 'tor',
                service: 'tor',
                version: '0.1.0',
              }
            ],
            env: []
          },
          {
            name: 'lnapi',
            version: '0.1.0',
            dependencies: [
              {
                application: 'tor',
                service: 'tor',
                version: '0.1.0',
              },
              {
                application: 'lightning-node',
                service: 'bitcoind',
                version: '0.1.0',
              },
              {
                application: 'lightning-node',
                service: 'lnd',
                version: '0.1.0',
              }
            ],
            env: []
          },
          {
            name: 'lnd',
            version: '0.1.0',
            dependencies: [
              {
                application: 'tor',
                service: 'tor',
                version: '0.1.0',
              },
              {
                application: 'lightning-node',
                service: 'bitcoind',
                version: '0.1.0',
              }
            ],
            env: []
          },
          {
            name: 'space-fleet',
            version: '0.1.0',
            dependencies: [],
            env: []
          },
        ],
      },
      ymlPath: '/usr/local/casa/applications/lightning-node/0.1.0/lightning-node.yml',
    };

    const updateManagerBuildDetails = { name: 'update-manager',
      version: '0.1.0',
      priority: 'system',
      metadata: {
        services: [
          {
            name: 'update-manager',
            version: '0.1.0',
            dependencies: [],
            env: []
          }
        ],
      },
      ymlPath: '/usr/local/casa/applications/update-manager/0.1.0/update-manager.yml',
    };

    it('should return no services if no details are passed', async function() {
      const services = await applicationLogic.getServiceBootOrder([]);
      services.length.should.equal(0);
    });

    it('should return one service', async function() {

      const services = await applicationLogic.getServiceBootOrder([torBuildDetails]);

      services.length.should.equal(1);
      services[0].name.should.equal(torBuildDetails.name);
      services[0].version.should.equal(torBuildDetails.version);
      services[0].priority.should.equal(torBuildDetails.priority);
      services[0].ymlPath.should.equal(torBuildDetails.ymlPath);

    });

    it('should respect priority base case', async function() {

      const services = await applicationLogic.getServiceBootOrder([torBuildDetails, updateManagerBuildDetails]);

      services.length.should.equal(2);

      services[0].name.should.equal(updateManagerBuildDetails.name);
      services[0].version.should.equal(updateManagerBuildDetails.version);
      services[0].priority.should.equal(updateManagerBuildDetails.priority);
      services[0].ymlPath.should.equal(updateManagerBuildDetails.ymlPath);

      services[1].name.should.equal(torBuildDetails.name);
      services[1].version.should.equal(torBuildDetails.version);
      services[1].priority.should.equal(torBuildDetails.priority);
      services[1].ymlPath.should.equal(torBuildDetails.ymlPath);

    });

    it('should respect priority multiple', async function() {

      const services = await applicationLogic.getServiceBootOrder([torBuildDetails, updateManagerBuildDetails, explorerBuildDetails]);

      services.length.should.equal(3);

      services[0].name.should.equal(updateManagerBuildDetails.name);
      services[0].version.should.equal(updateManagerBuildDetails.version);
      services[0].priority.should.equal(updateManagerBuildDetails.priority);
      services[0].ymlPath.should.equal(updateManagerBuildDetails.ymlPath);

    });

    it('should respect single dependency', async function() {

      const services = await applicationLogic.getServiceBootOrder([bitcoindBuildDetails, torBuildDetails]);

      services.length.should.equal(2);

      services[0].name.should.equal(torBuildDetails.name);
      services[0].version.should.equal(torBuildDetails.version);
      services[0].priority.should.equal(torBuildDetails.priority);
      services[0].ymlPath.should.equal(torBuildDetails.ymlPath);

      services[1].name.should.equal(bitcoindBuildDetails.name);
      services[1].version.should.equal(bitcoindBuildDetails.version);
      services[1].priority.should.equal(bitcoindBuildDetails.priority);
      services[1].ymlPath.should.equal(bitcoindBuildDetails.ymlPath);

    });

    it('should respect multiple layered dependencies', async function() {

      const services = await applicationLogic.getServiceBootOrder([lightningNodeBuildDetails, torBuildDetails]);

      services.length.should.equal(5);

      services[0].name.should.equal(lightningNodeBuildDetails.metadata.services[3].name);
      services[0].version.should.equal(lightningNodeBuildDetails.metadata.services[3].version);
      services[0].priority.should.equal(lightningNodeBuildDetails.metadata.services[3].priority);
      services[0].ymlPath.should.equal(lightningNodeBuildDetails.metadata.services[3].ymlPath);

      services[1].name.should.equal(torBuildDetails.name);
      services[1].version.should.equal(torBuildDetails.version);
      services[1].priority.should.equal(torBuildDetails.priority);
      services[1].ymlPath.should.equal(torBuildDetails.ymlPath);

      services[2].name.should.equal(lightningNodeBuildDetails.metadata.services[0].name);
      services[2].version.should.equal(lightningNodeBuildDetails.metadata.services[0].version);
      services[2].priority.should.equal(lightningNodeBuildDetails.metadata.services[0].priority);
      services[2].ymlPath.should.equal(lightningNodeBuildDetails.metadata.services[0].ymlPath);

      services[3].name.should.equal(lightningNodeBuildDetails.metadata.services[2].name);
      services[3].version.should.equal(lightningNodeBuildDetails.metadata.services[2].version);
      services[3].priority.should.equal(lightningNodeBuildDetails.metadata.services[2].priority);
      services[3].ymlPath.should.equal(lightningNodeBuildDetails.metadata.services[2].ymlPath);

      services[4].name.should.equal(lightningNodeBuildDetails.metadata.services[1].name);
      services[4].version.should.equal(lightningNodeBuildDetails.metadata.services[1].version);
      services[4].priority.should.equal(lightningNodeBuildDetails.metadata.services[1].priority);
      services[4].ymlPath.should.equal(lightningNodeBuildDetails.metadata.services[1].ymlPath);

    });

  })

});
