const { TYPE, SUBTYPE } = require('../utils/constants');
const { REGISTRY } = require('./modelConstants');

/**
* Transactions define custom methods that can be called through the API.
* The payload is type checked and all references are resolved dynamically.
*/
exports.transactions = {
  createTokens: {
    description: 'Create new tokens for member',
    registry: REGISTRY.token,
    input: {
      type: TYPE.object,
      properties: {
        ownerId: { type: TYPE.string },
        amount: { type: TYPE.number },
        depositId: { type: TYPE.string },
        creationDate: { optional: true, type: TYPE.string }
      }
    },
    output: [
      { type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.token },
      { type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.transferDetails }
    ]
  },
  transferTokens: {
    description: 'Transfer tokens from member to member',
    registry: REGISTRY.token,
    input: {
      type: TYPE.object,
      properties: {
        senderId: { type: TYPE.string },
        receiverId: { type: TYPE.string },
        amount: { type: TYPE.number },
        transferId: { type: TYPE.string },
        creationDate: { optional: true, type: TYPE.string }
      }
    },
    output: [
      { type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.token },
      { type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.spent_tokens },
      { type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.transferDetails }
    ]
  }
};
