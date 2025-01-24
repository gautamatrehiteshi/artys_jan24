/* eslint-disable import/no-unresolved */
const { ChaincodeStub } = require('fabric-shim');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiExclude = require('chai-exclude');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const { expect, assert } = require('chai');
/* eslint-enable import/no-unresolved */

const { model } = require('../../src/models/model');
const { createTokens, transferTokens, resolveTransfer } = require('../../src/lib/tokens');
const { REGISTRY } = require('../../src/models/modelConstants');

chai.should();
chai.use(chaiAsPromised);
chai.use(chaiExclude);
chai.use(sinonChai);

describe('Unit test: Token lifecycle', async () => {
  const senderId = 'sender';
  const receiverId = 'receiver';
  const depositId = 'depo1';
  const amount = 35;
  const amount2 = 15;
  const transferId = 'transfer1';
  const creationDate = 'today';

  let stub;
  beforeEach(() => {
    stub = sinon.createStubInstance(ChaincodeStub);
    stub.model = model;
    stub.getTxTimestamp.returns({ seconds: { low: '1585591067' } });
  });

  describe('createTokens', async () => {
    it('Should not issue tokens if token amount is not strictly positive', async () => {
      await assert.isRejected(
        createTokens(stub, { ownerId: senderId, amount: -12, depositId }),
        'Amount of tokens created should be strictly positive.'
      );
      await assert.isRejected(
        createTokens(stub, { ownerId: senderId, amount: 0, depositId }),
        'Amount of tokens created should be strictly positive.'
      );
    });
    it('Should create tokens', async () => {
      const input = { ownerId: senderId, amount: 35, depositId };
      const output = {
        id: input.depositId,
        ownerId: input.ownerId,
        amount: input.amount
      };
      const ops = await createTokens(stub, input);
      expect(ops[0].operation).to.eql('createAsset');
      expect(ops[0].registry).to.eql(REGISTRY.token);
      expect(ops[0].payload).excluding('creationDate').to.deep.eql(output);
    });
  });

  describe('resolveTransfer', async () => {
    beforeEach(() => {
      stub.getBinding.returns('hash');
    });

    it('Should resolve transfer with full token sending', async () => {
      const sendingToken = { id: 'token1', amount: 1, ownerId: senderId };
      const receivingToken = { id: 'token2', amount: 1, ownerId: receiverId };
      const output = [
        { operation: 'createAsset', registry: REGISTRY.token, payload: receivingToken },
        { operation: 'createAsset', registry: REGISTRY.spent_tokens, payload: sendingToken },
        { operation: 'deleteAsset', registry: REGISTRY.token, payload: { id: sendingToken.id, ownerId: sendingToken.ownerId } }
      ];
      const res = resolveTransfer(stub, [sendingToken], [receivingToken]);
      expect(res).to.have.deep.members(output);
    });

    it('Should resolve transfer with partial token sending', async () => {
      const sendingToken = { id: 'token1', amount: 2, ownerId: senderId };
      const receivingToken = { id: 'token2', amount: 1, ownerId: receiverId };
      const output = [
        { operation: 'createAsset', registry: REGISTRY.token, payload: receivingToken },
        {
          operation: 'createAsset',
          registry: REGISTRY.token,
          payload: {
            id: `hash${JSON.stringify({ ownerId: senderId, amount: 1 })}`,
            ownerId: senderId,
            amount: 1
          }
        },
        { operation: 'createAsset', registry: REGISTRY.spent_tokens, payload: sendingToken },
        { operation: 'deleteAsset', registry: REGISTRY.token, payload: { id: sendingToken.id, ownerId: sendingToken.ownerId } }
      ];
      const res = resolveTransfer(stub, [sendingToken], [receivingToken]);
      expect(res).to.have.deep.members(output);
    });
  });

  describe('transferTokens', async () => {
    beforeEach(() => {
      const ownerId = senderId;
      const id = transferId;
      const key = 'compositeKey';
      stub.createCompositeKey.withArgs(REGISTRY.token, [ownerId, id]).returns(key);
      stub.splitCompositeKey.withArgs(key).returns(
        { objectType: REGISTRY.token, attributes: [ownerId, id] }
      );
      stub.getState.withArgs(key).returns(JSON.stringify({ amount }));

      stub.createCompositeKey.withArgs(REGISTRY.token, [ownerId]).returns('partialKey');
      stub.splitCompositeKey.withArgs('partialKey').returns({ objectType: REGISTRY.token, attributes: [ownerId] });
      stub.getStateByPartialCompositeKey
        .withArgs(REGISTRY.token, [ownerId])
        .returns(
          [{
            value: JSON.stringify({
              id: depositId, ownerId: senderId, amount, docType: REGISTRY.token
            })
          }][Symbol.iterator]()
        );

      stub.createCompositeKey.withArgs(REGISTRY.token, [receiverId]).returns('partialKeyReceiver');
      stub.splitCompositeKey.withArgs('partialKeyReceiver').returns({ objectType: REGISTRY.token, attributes: [receiverId] });
      stub.getStateByPartialCompositeKey
        .withArgs(REGISTRY.token, [receiverId])
        .returns([
          {
            value: JSON.stringify({
              id: 'depo2', ownerId: receiverId, amount, docType: REGISTRY.token
            })
          },
          {
            value: JSON.stringify({
              id: 'depo3', ownerId: receiverId, amount: amount2, docType: REGISTRY.token
            })
          }
        ][Symbol.iterator]());

      stub.getBinding.returns('hash_');
    });

    it('Should not issue tokens if there is a negative amount', async () => {
      const input = {
        senderId, receiverId, transferId, amount: -12, creationDate
      };
      await assert.isRejected(
        transferTokens(stub, input),
        'Amount of tokens transfered should be strictly positive.'
      );
    });

    it('Should not issue tokens if there aren\'t enough tokens', async () => {
      const amountAsked = 50;
      const input = {
        senderId, receiverId, transferId, amount: amountAsked, creationDate
      };
      await assert.isRejected(
        transferTokens(stub, input),
        `Cannot send ${amountAsked}. ${senderId} only has ${amount} tokens available.`
      );
    });

    it('Should issue tokens if there is the exact amount', async () => {
      const newTokenId = `hash_${JSON.stringify({ ownerId: receiverId, amount })}`;
      const output = [
        {
          operation: 'createAsset',
          registry: REGISTRY.token,
          payload: { id: newTokenId, ownerId: receiverId, amount }
        },
        {
          operation: 'createAsset',
          registry: REGISTRY.spent_tokens,
          payload: { id: depositId, ownerId: senderId, amount }
        },
        {
          operation: 'deleteAsset',
          registry: REGISTRY.token,
          payload: { id: depositId, ownerId: senderId }
        },
        {
          operation: 'createAsset',
          registry: REGISTRY.transferDetails,
          payload: {
            id: transferId,
            senderId,
            receiverId,
            amount,
            creationDate,
            stxos: [depositId],
            utxos: [newTokenId]
          }
        }
      ];
      const input = {
        senderId, receiverId, transferId, amount, creationDate
      };
      const res = await transferTokens(stub, input);
      expect(res).to.have.deep.members(output);
    });

    it('Should issue tokens if there is more than the required amount', async () => {
      const amountAsked = 29;
      const newTokenId = `hash_${JSON.stringify({ ownerId: receiverId, amount: amountAsked })}`;
      const leftoverTokenId = `hash_${JSON.stringify({ ownerId: senderId, amount: amount - amountAsked })}`;
      const output = [
        {
          operation: 'createAsset',
          registry: REGISTRY.token,
          payload: { id: newTokenId, ownerId: receiverId, amount: amountAsked }
        },
        {
          operation: 'createAsset',
          registry: REGISTRY.token,
          payload: { id: leftoverTokenId, ownerId: senderId, amount: amount - amountAsked }
        },
        {
          operation: 'createAsset',
          registry: REGISTRY.spent_tokens,
          payload: { id: depositId, ownerId: senderId, amount }
        },
        {
          operation: 'deleteAsset',
          registry: REGISTRY.token,
          payload: { id: depositId, ownerId: senderId }
        },
        {
          operation: 'createAsset',
          registry: REGISTRY.transferDetails,
          payload: {
            id: transferId,
            senderId,
            receiverId,
            amount: amountAsked,
            creationDate,
            stxos: [depositId],
            utxos: [newTokenId, leftoverTokenId]
          }
        }
      ];
      const input = {
        senderId, receiverId, transferId, amount: amountAsked, creationDate
      };
      const res = await transferTokens(stub, input);
      expect(res).to.have.deep.members(output);
    });

    it('Should issue tokens if there are multiple deposits', async () => {
      const sender2 = receiverId;
      const receiver2 = senderId;
      const amountTotal = amount + amount2;
      const amountAsked = 40;
      const newTokenId = `hash_${JSON.stringify({ ownerId: receiver2, amount: amountAsked })}`;
      const leftoverTokenId = `hash_${JSON.stringify({ ownerId: sender2, amount: amountTotal - amountAsked })}`;
      const output = [
        // create new 40, new 10
        {
          operation: 'createAsset',
          registry: REGISTRY.token,
          payload: { id: newTokenId, ownerId: receiver2, amount: amountAsked }
        },
        {
          operation: 'createAsset',
          registry: REGISTRY.token,
          payload: { id: leftoverTokenId, ownerId: sender2, amount: amountTotal - amountAsked }
        },
        // delete old 35
        {
          operation: 'deleteAsset',
          registry: REGISTRY.token,
          payload: { id: 'depo2', ownerId: sender2 }
        },
        {
          operation: 'createAsset',
          registry: REGISTRY.spent_tokens,
          payload: { id: 'depo2', ownerId: sender2, amount }
        },
        // delete old 15
        {
          operation: 'deleteAsset',
          registry: REGISTRY.token,
          payload: { id: 'depo3', ownerId: sender2 }
        },
        {
          operation: 'createAsset',
          registry: REGISTRY.spent_tokens,
          payload: { id: 'depo3', ownerId: sender2, amount: amount2 }
        },
        {
          operation: 'createAsset',
          registry: REGISTRY.transferDetails,
          payload: {
            id: 'transfer2',
            senderId: sender2,
            receiverId: receiver2,
            amount: amountAsked,
            creationDate,
            stxos: ['depo2', 'depo3'],
            utxos: [newTokenId, leftoverTokenId]
          }
        }
      ];
      const input = {
        senderId: sender2, receiverId: receiver2, transferId: 'transfer2', amount: amountAsked, creationDate
      };
      const res = await transferTokens(stub, input);
      expect(res).to.have.deep.members(output);
    });
  });
});
