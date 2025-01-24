const { TYPE, SUBTYPE } = require('../utils/constants');
const { REGISTRY } = require('./modelConstants');

/**
* Model Registries
*/
exports.registries = {
  utxo: {
    destination: 'state',
    key: [
      { name: 'ownerId', type: TYPE.string } // ownerId
    ],
    schema: {
      title: REGISTRY.token,
      type: TYPE.object,
      additionalProperties: false,
      properties: {
        id: { type: TYPE.string },
        ownerId: { type: TYPE.string },
        amount: { type: TYPE.number }
      }
    }
  },
  stxo: {
    destination: 'state',
    key: [
      { name: 'ownerId', type: TYPE.string } // ownerId
    ],
    schema: {
      title: REGISTRY.spent_tokens,
      type: TYPE.object,
      additionalProperties: false,
      properties: {
        id: { type: TYPE.string },
        ownerId: { type: TYPE.string },
        amount: { type: TYPE.number }
      }
    }
  },
  transferDetails: {
    destination: 'state',
    key: [],
    schema: {
      title: REGISTRY.transferDetails,
      type: TYPE.object,
      additionalProperties: false,
      properties: {
        id: { optional: false, type: TYPE.string },
        senderId: { optional: true, type: TYPE.string },
        receiverId: { type: TYPE.string },
        amount: { type: TYPE.number },
        creationDate: { type: TYPE.string },
        stxos: {
          optional: true,
          type: TYPE.object,
          subtype: SUBTYPE.array,
          item: {
            type: TYPE.string
            // should be the unique Id used in both utxo and stxo
            // subtype: SUBTYPE.ref,
            // resource: REGISTRY.spent_tokens
          }
        },
        utxos: {
          optional: true,
          type: TYPE.object,
          subtype: SUBTYPE.array,
          item: {
            type: TYPE.string
            // should be the unique Id used in both utxo and stxo
            // but utxo are only temporary
            // subtype: SUBTYPE.ref,
            // resource: REGISTRY.token
          }
        }
      }
    }
  }
};
