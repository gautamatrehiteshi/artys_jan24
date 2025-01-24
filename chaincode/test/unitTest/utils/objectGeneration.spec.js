/* eslint-disable import/no-unresolved */
const { ChaincodeStub } = require('fabric-shim');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiExclude = require('chai-exclude');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const { expect } = require('chai');
/* eslint-enable import/no-unresolved */
const { REGISTRY } = require('../../../src/models/modelConstants');
const { generateQuery } = require('../../../src/utils/objectGeneration');
const { model } = require('./model');

chai.should();
chai.use(chaiAsPromised);
chai.use(chaiExclude);
chai.use(sinonChai);

describe('Unit test: Object generation', async () => {
  const ownerId = 'bob';

  let stub;
  beforeEach(() => {
    stub = sinon.createStubInstance(ChaincodeStub);
    stub.model = model;
  });

  describe('Query generation', async () => {
    it('Should generate a query without any arguments', async () => {
      const querySelector = { selector: { docType: REGISTRY.transferDetails } };
      const args = {};

      const query = await generateQuery(stub, querySelector, args);
      expect(query).to.eql(querySelector);
    });
    it('Should generate a query with arguments', async () => {
      const querySelector = { selector: { docType: REGISTRY.token, ownerId: '{ownerId}' } };
      const args = { ownerId };
      const expected = { selector: { docType: REGISTRY.token, ownerId } };

      const query = await generateQuery(stub, querySelector, args);
      expect(query).to.eql(expected);
    });
    it('Should generate a query with complexe arguments', async () => {
      const querySelector = { selector: { docType: REGISTRY.token, amount: { $eq: '{amount}' } } };
      const args = { amount: 0 };
      const expected = { selector: { docType: REGISTRY.token, amount: { $eq: 0 } } };

      const query = await generateQuery(stub, querySelector, args);
      expect(query).to.eql(expected);
    });
    it('Should generate a query with multiple complex arguments', async () => {
      const querySelector = {
        selector: {
          docType: REGISTRY.token, amount: { $eq: '{amount}' }, ownerId: '{ownerId}'
        }
      };
      const args = { amount: 0, ownerId };
      const expected = { selector: { docType: REGISTRY.token, amount: { $eq: 0 }, ownerId } };

      const query = await generateQuery(stub, querySelector, args);
      expect(query).to.eql(expected);
    });
  });
});
