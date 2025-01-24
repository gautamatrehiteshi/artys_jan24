const { REGISTRY } = require('./modelConstants');
const { TYPE, SUBTYPE } = require('../utils/constants');

/**
* The queries have a unique structure. They request data directly onto the ledger.
*
* The args property list all the arguments that must be passed to the query.
* The query structure is different from other objects in the model
* because they are run by the couchDB engine.
* A preprocessing step replaces the arguments with their provided values,
* after the usual type and dependency checks.
*/

exports.queries = {
  queryWalletContent: {
    description: 'Query all tokens owned by member',
    registry: REGISTRY.token,
    input: { type: TYPE.object, properties: { ownerId: { type: TYPE.string } } },
    output: [{ type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.token }],
    query: {
      selector: {
        docType: REGISTRY.token,
        ownerId: '{ownerId}'
      }
    }
  },
  queryInboundTransactions: {
    description: 'Query all transactions received by member',
    registry: REGISTRY.transferDetails,
    input: { type: TYPE.object, properties: { receiverId: { type: TYPE.string } } },
    output: [{ type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.transferDetails }],
    query: {
      selector: {
        docType: REGISTRY.transferDetails,
        receiverId: '{receiverId}'
      }
    }
  },
  queryOutboundTransactions: {
    description: 'Query all transactions sent by member',
    registry: REGISTRY.transferDetails,
    input: { type: TYPE.object, properties: { senderId: { type: TYPE.string } } },
    output: [{ type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.transferDetails }],
    query: {
      selector: {
        docType: REGISTRY.transferDetails,
        senderId: '{senderId}'
      }
    }
  }
};
