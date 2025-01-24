/* eslint-disable import/no-unresolved */
const { ChaincodeStub } = require('fabric-shim');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiExclude = require('chai-exclude');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const { expect } = require('chai');
/* eslint-enable import/no-unresolved */
const { ERRORS } = require('../../../src/utils/errors');
const { TYPE } = require('../../../src/utils/constants');
const {
  invokeCrud, invokeCrudSurcharge, invokeTransaction, invokeQuery, invokeCustomQuery
} = require('../../../src/utils/invoke');
const transactions = require('../../../src/lib/_transactions');
const { model } = require('./model');

chai.should();
chai.use(chaiAsPromised);
chai.use(chaiExclude);
chai.use(sinonChai);

describe('Unit test: Invoke functions', async () => {
  const id = 'thing_1';
  const ownerId = 'bob';
  const amount = 3;
  const docType = 'utxo';
  const key = 'key';
  const key2 = 'key2';
  const item = {
    id, ownerId, amount, docType
  };
  const query = { selector: { docType: 'transferDetails', receiverId: 'bob' } };

  let stub;

  beforeEach(() => {
    stub = sinon.createStubInstance(ChaincodeStub);
    stub.model = model;
    stub.newLogger = () => console;
  });

  describe('invokeQuery', async () => {
    beforeEach(() => {
      const iterator = [{ value: JSON.stringify(item) }][Symbol.iterator]();
      stub.getQueryResultWithPagination
        .withArgs(JSON.stringify(query), 50, undefined)
        .returns({ iterator, metadata: {} });
    });
    it('Should process a query', async () => {
      const expectedList = [item];
      const queryDef = model.queries.queryInboundTransactions;
      const params = { receiverId: 'bob' };

      const { records } = await invokeQuery(stub, params, queryDef);
      expect(records).to.eql(expectedList);
    });
    it('Should process a custom query', async () => {
      const expectedList = [item];
      const { records } = await invokeCustomQuery(stub, query);
      expect(records).to.eql(expectedList);
    });
  });

  describe('invokeTransaction', async () => {
    beforeEach(() => {
      stub.createCompositeKey.withArgs(docType, [ownerId, id]).returns(key);
      stub.splitCompositeKey.withArgs(key).returns(
        { objectType: docType, attributes: [ownerId, id] }
      );

      stub.createCompositeKey.withArgs('transferDetails', [id]).returns(key2);
      stub.splitCompositeKey.withArgs(key2).returns({ objectType: 'transferDetails', attributes: [id] });

      stub.getTxTimestamp.returns({ seconds: { low: '1585591067' } });
    })
    it('Should process a transaction', async () => {
      const expectedList = [
        item,
        {
          id,
          receiverId: ownerId,
          amount,
          utxos: [id],
          stxos: [],
          creationDate: '1585591067',
          docType: 'transferDetails'
        }
      ];
      const params = { ownerId, amount, depositId: id };
      const transaction = transactions.createTokens;
      const transactionDef = model.transactions.createTokens;

      const payload = await invokeTransaction(stub, params, transaction, transactionDef);
      expect(payload).to.eql(expectedList);
    });
  });
});
