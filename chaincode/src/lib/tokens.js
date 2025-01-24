const { readAll } = require('../utils/_utils');
const { REGISTRY } = require('../models/modelConstants');
const { OPS } = require('../utils/constants');
const { ValidationError } = require('../utils/errors');
const { getTimestamp } = require('../utils/time');

/** createTokens
* @param {any} stub - Blockchain stub interface
* @param {any} payload:
*  - {string} receiverId
*  - {number} amount
*  - {string} depositId
*  - ({string} creationDate)
* @return {operation[]} return the operations to be performed
*/
async function createTokens (stub, payload) {
  const {
    ownerId, amount, depositId, creationDate
  } = payload;
  if (amount <= 0) {
    throw new ValidationError('Amount of tokens created should be strictly positive.');
  }
  return [
    {
      operation: OPS.create,
      registry: REGISTRY.token,
      payload: { id: depositId, ownerId, amount }
    },
    {
      operation: OPS.create,
      registry: REGISTRY.transferDetails,
      payload: {
        id: depositId,
        receiverId: ownerId,
        amount,
        creationDate: creationDate || getTimestamp(stub),
        utxos: [depositId]
      }
    }
  ];
}

/** getUTXOs
* @param {any} stub - Blockchain stub interface
* @param {string} ownerId
* @return {operation[]} return the operations to be performed
*/
async function getUTXOs (stub, ownerId) {
  const senderTokens = await readAll(stub, REGISTRY.token, { ownerId });
  return senderTokens;
}

/** transferTokens
* @param {any} stub - Blockchain stub interface
* @param {any} payload:
*  - {string} senderId
*  - {string} receiverId
*  - {number} amount
*  - {string} transferId
*  - ({string} creationDate)
* @return {operation[]} return the operations to be performed
*/
async function transferTokens (stub, payload) {
  const {
    senderId, receiverId, amount, transferId, creationDate
  } = payload;
  if (amount <= 0) {
    throw new ValidationError('Amount of tokens transfered should be strictly positive.');
  }

  const senderTokens = await getUTXOs(stub, senderId);
  const availableTokenAmount = senderTokens.reduce((acc, token) => token.amount + acc, 0);
  if (availableTokenAmount < amount) {
    throw new ValidationError(
      `Cannot send ${amount}. ${senderId} only has ${availableTokenAmount} tokens available.`
    );
  }

  const receiverToken = { ownerId: receiverId, amount };
  const receiverTokenId = generateId(stub, receiverToken);
  const tokenOperations = resolveTransfer(
    stub,
    senderTokens,
    [{ id: receiverTokenId, ...receiverToken }]
  );
  const transferDetailsOperation = {
    operation: OPS.create,
    registry: REGISTRY.transferDetails,
    payload: {
      id: transferId,
      senderId,
      receiverId,
      amount,
      creationDate,
      stxos: tokenOperations
        .filter(op => op.operation === OPS.create && op.registry === REGISTRY.spent_tokens)
        .map(op => op.payload.id),
      utxos: tokenOperations
        .filter(op => op.operation === OPS.create && op.registry === REGISTRY.token)
        .map(op => op.payload.id)
    }
  };
  return [...tokenOperations, transferDetailsOperation];
}

function resolveTransfer (stub, sendersArg, receiversArg) {
  const senders = [...sendersArg];
  const receivers = [...receiversArg];

  // constants and functions required during the iteration
  let currentSender;
  let currentAmountSender = 0;
  let currentReceiver;
  let currentAmountReceiver = 0;
  let operations = [];

  // iterate over sender and receiver items until all receivers are full
  while (receivers.length > 0 || currentAmountReceiver > 0) {
    // retrieve the next available sender/receiver if required
    if (currentAmountSender <= 0) {
      currentSender = senders.shift();
      currentAmountSender = currentSender.amount;
    }
    if (currentAmountReceiver <= 0) {
      currentReceiver = receivers.shift();
      currentAmountReceiver = currentReceiver.amount;
    }
    // send as much as possible until either the sender is empty or the receiver is full
    const tokenAmount = Math.min(currentAmountReceiver, currentAmountSender);
    currentAmountSender -= tokenAmount;
    currentAmountReceiver -= tokenAmount;

    // process operation based on tokenAmount
    if (currentAmountSender === 0) {
      operations = deleteTokenOperation(operations, currentSender);
    }
    if (currentAmountReceiver === 0) {
      operations = createTokenOperation(operations, currentReceiver);
    }
  }
  // there might be a sender still mid-process
  if (currentAmountSender > 0) {
    operations = deleteTokenOperation(operations, currentSender);
    const newToken = { ownerId: currentSender.ownerId, amount: currentAmountSender };
    const newTokenId = generateId(stub, newToken);
    operations = createTokenOperation(operations, { id: newTokenId, ...newToken });
  }
  return operations;
}

function createTokenOperation (operations, payload) {
  return [...operations, { operation: OPS.create, registry: REGISTRY.token, payload }];
}
function deleteTokenOperation (operations, payload) {
  const { id, ownerId, amount } = payload;
  return [
    ...operations,
    { operation: OPS.delete, registry: REGISTRY.token, payload: { id, ownerId } },
    { operation: OPS.create, registry: REGISTRY.spent_tokens, payload: { id, ownerId, amount } }
  ];
}
function generateId (stub, payload) {
  const salt = stub.getBinding();
  const id = salt + JSON.stringify(payload);
  return id;
}

exports.createTokens = createTokens;
exports.transferTokens = transferTokens;
exports.resolveTransfer = resolveTransfer;
