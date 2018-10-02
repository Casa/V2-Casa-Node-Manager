const Validator = require('jsonschema').Validator;

const settingsSchema = {
  type: 'object',
  properties: {
    bitcoind: {$ref: '/bitcoind'},
    lnd: {$ref: '/lnd'},
    node: {$ref: '/node'},
  },
  required: [
    'bitcoind',
    'lnd',
    'node',
  ],
  additionalProperties: false

};

const bitcoindSchema = {
  id: '/bitcoind',
  type: 'object',
  properties: {
    bitcoinNetwork: {$ref: '/networks'},
    bitcoindListen: {type: 'boolean'},
  },
  required: ['bitcoinNetwork', 'bitcoindListen'],
  additionalProperties: false
};

const lndSchema = {
  id: '/lnd',
  type: 'object',
  properties: {
    backend: {type: 'string', enum: ['bitcoind']},
    chain: {type: 'string', enum: ['bitcoin']},
    lndNetwork: {$ref: '/networks'},
    lndNodeAlias: {type: 'string'},
    autopilot: {type: 'boolean'},
    maxChannels: {
      type: 'integer',
      minimum: 0
    },
    maxChanSize: {
      type: 'integer',
      maximum: 16777216
    },
    openChanFeeRate: {type: 'number'},
  },
  oneOf: [
    {
      properties: {autopilot: {enum: [true]}},
      required: ['maxChannels', 'maxChanSize', 'openChanFeeRate'],
    },
    {
      properties: {autopilot: {enum: [false]}},
      required: [],
    },
  ],
  required: ['backend', 'chain', 'lndNetwork', 'autopilot'],
  additionalProperties: false
};

const nodeSchema = {
  id: '/node',
  type: 'object',
  properties: {
    remoteLogging: {type: 'boolean'},
  },
  required: ['remoteLogging'],
  additionalProperties: false
};


const availableNetworks = {
  id: '/networks',
  type: 'string',
  enum: ['testnet', 'mainnet']
};

function validateSettingsSchema(data) {
  var validator = new Validator();
  validator.addSchema(availableNetworks);
  validator.addSchema(lndSchema);
  validator.addSchema(bitcoindSchema);
  validator.addSchema(nodeSchema);

  return validator.validate(data, settingsSchema);
}

module.exports = {
  validateSettingsSchema
};
