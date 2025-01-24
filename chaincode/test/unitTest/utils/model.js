const { TYPE, SUBTYPE } = require('../../../src/utils/constants');
// model constants
const REGISTRY = { token: 'utxo', spent_tokens: 'stxo', transferDetails: 'transferDetails' };
const ENUM = { tokenStatus: 'tokenStatus' };
const TOKEN_STATUS = { ok: 'OK', fwd: 'FORWARDED' }

// Registries
const utxo = {
  destination: 'state',
  key: [{ name: 'ownerId', type: TYPE.string }],
  schema: {
    title: REGISTRY.token,
    type: TYPE.object,
    additionalProperties: false,
    properties: {
      id: { type: TYPE.string }, ownerId: { type: TYPE.string }, amount: { type: TYPE.number }
    }
  }
};
const stxo = {
  destination: 'state',
  key: [{ name: 'ownerId', type: TYPE.string }],
  schema: {
    title: REGISTRY.token,
    type: TYPE.object,
    additionalProperties: false,
    properties: {
      id: { type: TYPE.string }, ownerId: { type: TYPE.string }, amount: { type: TYPE.number }
    }
  }
};
const transferDetails = {
  destination: 'state',
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
        default: [],
        type: TYPE.object,
        subtype: SUBTYPE.array,
        item: { type: TYPE.string, subtype: SUBTYPE.ref, resource: REGISTRY.spent_tokens }
      },
      utxos: {
        default: [],
        type: TYPE.object,
        subtype: SUBTYPE.array,
        item: { type: TYPE.string }
      }
    }
  }
};

// Transactions
const createTokens = {
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
  output: [{ type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.token }]
};
const transferTokens = {
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
};

// Queries
const queryWalletContent = {
  description: 'Query all tokens owned by member',
  registry: REGISTRY.token,
  input: { type: TYPE.object, properties: { ownerId: { type: TYPE.string } } },
  output: [{ type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.token }],
  query: { selector: { docType: REGISTRY.token, ownerId: '{ownerId}' } }
};
const queryInboundTransactions = {
  description: 'Query all transactions received by member',
  registry: REGISTRY.transferDetails,
  input: { type: TYPE.object, properties: { receiverId: { type: TYPE.string } } },
  output: [{ type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.transferDetails }],
  query: { selector: { docType: REGISTRY.transferDetails, receiverId: '{receiverId}' } }
};
const queryOutboundTransactions = {
  description: 'Query all transactions sent by member',
  registry: REGISTRY.transferDetails,
  input: { type: TYPE.object, properties: { senderId: { type: TYPE.string } } },
  output: [{ type: TYPE.object, subtype: SUBTYPE.registry, resource: REGISTRY.transferDetails }],
  query: { selector: { docType: REGISTRY.transferDetails, senderId: '{senderId}' } }
};

exports.model = {
  registries: { utxo, stxo, transferDetails },
  transactions: { createTokens, transferTokens },
  queries: { queryWalletContent, queryInboundTransactions, queryOutboundTransactions }
};
